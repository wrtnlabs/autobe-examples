import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCustomersCustomerIdUnban(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  // Step 1: Find the customer (404 if not found or soft-deleted)
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
  // Step 2: Check if the customer is currently banned
  if (customer.is_banned === false) {
    throw new HttpException(
      "Customer is not currently banned and cannot be unbanned.",
      409,
    );
  }
  // Step 3: Update the customer record — set is_banned = false
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      is_banned: false,
      updated_at: new Date(),
    },
  });
  // Step 4: Fetch updated record and transform to DTO
  const updated =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      ...ShoppingMallCustomerTransformer.select(),
    });
  return ShoppingMallCustomerTransformer.transform(updated);
}
