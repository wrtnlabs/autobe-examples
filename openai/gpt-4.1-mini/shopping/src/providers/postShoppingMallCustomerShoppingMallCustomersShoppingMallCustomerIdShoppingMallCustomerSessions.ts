import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallCustomersShoppingMallCustomerIdShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
  shoppingMallCustomerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.ICreate;
}): Promise<IShoppingMallCustomerSession> {
  const nowISO = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;

  const createData = {
    id: v4() as string & tags.Format<"uuid">,
    shopping_mall_customer_id: props.shoppingMallCustomerId,
    ip: props.body.ip,
    href: props.body.href,
    referrer: props.body.referrer,
    expired_at: props.body.expired_at ?? null,
    created_at: nowISO,
  };

  const created = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: createData,
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    expired_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
    duration_minutes: props.body.duration_minutes ?? undefined,
    is_active: props.body.is_active ?? false,
    device_info: props.body.device_info ?? "",
    user_agent: props.body.user_agent ?? "",
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
  };
}
