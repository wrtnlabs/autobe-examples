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

export async function putShoppingMallCustomerShoppingMallCustomersShoppingMallCustomerIdShoppingMallCustomerSessionsShoppingMallCustomerSessionId(props: {
  customer: CustomerPayload;
  shoppingMallCustomerId: string & tags.Format<"uuid">;
  shoppingMallCustomerSessionId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.IUpdate;
}): Promise<IShoppingMallCustomerSession> {
  const existing =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: props.shoppingMallCustomerSessionId },
    });

  if (!existing) {
    throw new HttpException("Shopping mall customer session not found", 404);
  }

  if (existing.shopping_mall_customer_id !== props.shoppingMallCustomerId) {
    throw new HttpException(
      "Forbidden: session does not belong to the customer",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: props.shoppingMallCustomerSessionId },
    data: {
      ip: props.body.ip ?? "",
      href: props.body.href ?? "",
      referrer: props.body.referrer ?? "",
      expired_at:
        props.body.expired_at === undefined ? undefined : props.body.expired_at,
    },
  });

  return {
    id: existing.id,
    shopping_mall_customer_id: existing.shopping_mall_customer_id,
    ip: props.body.ip ?? "",
    href: props.body.href ?? "",
    referrer: props.body.referrer ?? "",
    created_at: toISOStringSafe(existing.created_at),
    expired_at:
      props.body.expired_at === null
        ? null
        : toISOStringSafe(
            props.body.expired_at !== undefined
              ? props.body.expired_at
              : existing.expired_at!,
          ),
    is_active:
      props.body.is_active !== undefined ? props.body.is_active : false,
    device_info:
      props.body.device_info !== undefined && props.body.device_info !== null
        ? props.body.device_info
        : "",
    user_agent:
      props.body.user_agent !== undefined && props.body.user_agent !== null
        ? props.body.user_agent
        : "",
  } satisfies IShoppingMallCustomerSession;
}
