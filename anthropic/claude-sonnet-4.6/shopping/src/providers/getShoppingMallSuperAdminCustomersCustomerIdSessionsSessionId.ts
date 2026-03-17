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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallCustomerSessionTransformer } from "../transformers/ShoppingMallCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminCustomersCustomerIdSessionsSessionId(props: {
  superAdmin: SuperadminPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerSession> {
  // Step 1: Verify the customer exists and is not deleted
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (customer === null) {
    throw new HttpException("Customer not found", 404);
  }
  // Step 2: Fetch the session scoped to this customer
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
