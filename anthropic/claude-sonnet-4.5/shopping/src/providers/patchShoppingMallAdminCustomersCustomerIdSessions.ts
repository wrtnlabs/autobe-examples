import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCustomersCustomerIdSessions(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession> {
  const { admin, customerId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereCondition = {
    customer_id: customerId,
    user_type: "customer",
    is_revoked: false,
    ...(body.device_type !== undefined &&
      body.device_type !== null && {
        device_type: body.device_type,
      }),
    ...((body.start_date !== undefined && body.start_date !== null) ||
    (body.end_date !== undefined && body.end_date !== null)
      ? {
          created_at: {
            ...(body.start_date !== undefined &&
              body.start_date !== null && {
                gte: body.start_date,
              }),
            ...(body.end_date !== undefined &&
              body.end_date !== null && {
                lte: body.end_date,
              }),
          },
        }
      : {}),
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sessions.findMany({
      where: whereCondition,
      orderBy: { last_activity_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        device_type: true,
        device_name: true,
        browser_name: true,
        operating_system: true,
        ip_address: true,
        approximate_location: true,
        created_at: true,
        last_activity_at: true,
        refresh_token_expires_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sessions.count({
      where: whereCondition,
    }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id as string & tags.Format<"uuid">,
    device_type: session.device_type ?? undefined,
    device_name: session.device_name ?? undefined,
    browser_name: session.browser_name ?? undefined,
    operating_system: session.operating_system ?? undefined,
    ip_address: session.ip_address ?? undefined,
    approximate_location: session.approximate_location ?? undefined,
    created_at: toISOStringSafe(session.created_at),
    last_activity_at: toISOStringSafe(session.last_activity_at),
    refresh_token_expires_at: toISOStringSafe(session.refresh_token_expires_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
