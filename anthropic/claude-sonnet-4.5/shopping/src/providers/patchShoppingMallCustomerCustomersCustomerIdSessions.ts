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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCustomersCustomerIdSessions(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession> {
  const { customer, customerId, body } = props;

  // Authorization: verify customer can only access their own sessions
  if (customer.id !== customerId) {
    throw new HttpException(
      "Unauthorized: You can only view your own sessions",
      403,
    );
  }

  // Pagination with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build date filter if either start or end date is provided
  const dateFilter =
    body.start_date !== undefined && body.start_date !== null
      ? body.end_date !== undefined && body.end_date !== null
        ? {
            created_at: {
              gte: body.start_date,
              lte: body.end_date,
            },
          }
        : {
            created_at: {
              gte: body.start_date,
            },
          }
      : body.end_date !== undefined && body.end_date !== null
        ? {
            created_at: {
              lte: body.end_date,
            },
          }
        : {};

  // Execute queries in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sessions.findMany({
      where: {
        customer_id: customerId,
        user_type: "customer",
        is_revoked: false,
        ...(body.device_type !== undefined &&
          body.device_type !== null && {
            device_type: body.device_type,
          }),
        ...dateFilter,
      },
      orderBy: { last_activity_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sessions.count({
      where: {
        customer_id: customerId,
        user_type: "customer",
        is_revoked: false,
        ...(body.device_type !== undefined &&
          body.device_type !== null && {
            device_type: body.device_type,
          }),
        ...dateFilter,
      },
    }),
  ]);

  // Transform sessions to DTO format
  const data: IShoppingMallCustomerSession[] = sessions.map((session) => ({
    id: session.id,
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

  // Return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
