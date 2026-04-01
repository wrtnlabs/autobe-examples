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

export async function putShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  // Find the customer and verify they exist and are not soft-deleted
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: {
        id: props.customerId,
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        phone_number: true,
      },
    });
  // Build update data with only provided fields
  const updateData: Prisma.shopping_mall_customersUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.phone_number !== undefined) {
    updateData.phone_number = props.body.phone_number;
  }
  // Update the customer record
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: updateData,
    ...ShoppingMallCustomerTransformer.select(),
  });
  // Transform and return the updated customer
  return await ShoppingMallCustomerTransformer.transform(updated);
}
