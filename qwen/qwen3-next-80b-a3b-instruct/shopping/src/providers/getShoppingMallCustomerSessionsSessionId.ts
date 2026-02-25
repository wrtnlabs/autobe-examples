import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerSessionAtDetailTransformer } from "../transformers/ShoppingMallCustomerSessionAtDetailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string;
}): Promise<IShoppingMallCustomerSession.IDetail> {
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        created_at: true,
        ip: true,
        href: true,
        referrer: true,
        expired_at: true,
        shopping_mall_customer_id: true,
        customer: { select: { id: true } },
      },
    });
  if (session.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallCustomerSessionAtDetailTransformer.transform(
    session,
  );
}
