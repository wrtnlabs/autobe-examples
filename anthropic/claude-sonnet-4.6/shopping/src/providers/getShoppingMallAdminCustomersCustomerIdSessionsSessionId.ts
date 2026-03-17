import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerSessionTransformer } from "../transformers/ShoppingMallCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminCustomersCustomerIdSessionsSessionId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerSession> {
  // Step 1: Verify the customer exists and is not deleted
  await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Find the session scoped to this customer
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirstOrThrow({
      where: {
        id: props.sessionId,
        shopping_mall_customer_id: props.customerId,
      },
      ...ShoppingMallCustomerSessionTransformer.select(),
    });
  // Step 3: Transform and return
  return ShoppingMallCustomerSessionTransformer.transform(session);
}
