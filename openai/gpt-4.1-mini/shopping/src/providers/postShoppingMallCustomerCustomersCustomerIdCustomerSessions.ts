import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCustomersCustomerIdCustomerSessions(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.ICreate;
}): Promise<IShoppingMallCustomerSession> {
  const newId = v4() as string & tags.Format<"uuid">;
  const now = new Date(Date.now());
  const expiresDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const created = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: newId,
      shopping_mall_customer_id: props.customerId,
      ip:
        props.body.ip === null || props.body.ip === undefined
          ? ""
          : (props.body.ip satisfies string as string),
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: expiresDate,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    ip: created.ip === null ? undefined : created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expires_at: toISOStringSafe(created.expired_at ?? new Date()),
    last_active_at: null,
  } satisfies IShoppingMallCustomerSession;
}
