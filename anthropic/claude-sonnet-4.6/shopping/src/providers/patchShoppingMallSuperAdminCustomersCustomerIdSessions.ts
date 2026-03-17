import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminCustomersCustomerIdSessions(props: {
  superAdmin: SuperadminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  // Verify customer exists
  await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
    where: { id: props.customerId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput = {
    shopping_mall_customer_id: props.customerId,
    ...(props.body.status === "active"
      ? { expired_at: { gt: now } }
      : props.body.status === "expired"
        ? { expired_at: { lte: now } }
        : {}),
    ...(props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          created_at: {
            ...(props.body.createdAtFrom != null
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo != null
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.ip != null ? { ip: props.body.ip } : {}),
  } satisfies Prisma.shopping_mall_customer_sessionsWhereInput;
  const sessions =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where: whereInput,
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  const total = await MyGlobal.prisma.shopping_mall_customer_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: sessions.map(
      (session) =>
        ({
          id: session.id,
          ip: session.ip,
          href: session.href,
          referrer: session.referrer,
          is_active: session.expired_at > now,
          created_at: session.created_at.toISOString(),
          expired_at: session.expired_at.toISOString(),
        }) satisfies IShoppingMallCustomerSession.ISummary,
    ),
  };
}
