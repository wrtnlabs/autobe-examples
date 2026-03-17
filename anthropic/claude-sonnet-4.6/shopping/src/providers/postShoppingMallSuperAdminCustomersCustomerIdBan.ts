import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminCustomersCustomerIdBan(props: {
  superAdmin: SuperadminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  // Step 1: Look up customer, ensure not soft-deleted
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
      where: {
        id: props.customerId,
        deleted_at: null,
      },
      select: {
        id: true,
        is_banned: true,
      },
    });
  // Step 2: Reject if already banned (409 Conflict)
  if (customer.is_banned === true) {
    throw new HttpException("Customer account is already banned.", 409);
  }
  // Step 3: Atomically ban the customer and invalidate all active sessions
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_customers.update({
      where: { id: props.customerId },
      data: {
        is_banned: true,
        updated_at: new Date(),
      },
    });
    // Invalidate all currently active sessions (expired_at > now)
    const now = new Date();
    await tx.shopping_mall_customer_sessions.updateMany({
      where: {
        shopping_mall_customer_id: props.customerId,
        expired_at: { gt: now },
      },
      data: {
        expired_at: now,
      },
    });
  });
  // Step 4: Fetch and return the updated customer record
  const updated =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      ...ShoppingMallCustomerTransformer.select(),
    });
  return ShoppingMallCustomerTransformer.transform(updated);
}
