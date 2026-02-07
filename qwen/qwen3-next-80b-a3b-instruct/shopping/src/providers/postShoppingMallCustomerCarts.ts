import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCartItemCollector } from "../collectors/ShoppingMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Since IShoppingMallCartItem.ICreate is empty, we must retrieve the variant record from database
  // to get its ID for the collector and validate business constraints
  const variantRecord =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.shopping_mall_product_variant_id },
      include: {
        product: {
          include: {
            seller: true,
          },
        },
      },
    });
  // Validate variant exists and is active
  if (!variantRecord) {
    throw new HttpException("Product variant not found", 400);
  }
  // Validate stock is available
  if (variantRecord.stock <= 0) {
    throw new HttpException("Insufficient stock", 400);
  }
  // Validate seller is approved
  if (
    !variantRecord.product.seller.approval_status ||
    variantRecord.product.seller.approval_status !== "approved"
  ) {
    throw new HttpException("Seller not approved", 400);
  }
  // Validate product is not deleted
  if (variantRecord.product.deleted_at !== null) {
    throw new HttpException("Product has been deleted", 400);
  }
  // Use the variant ID from the database result instead of DTO
  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: await ShoppingMallCartItemCollector.collect({
      body: props.body,
      shoppingMallProductVariant: { id: variantRecord.id },
      shoppingMallCustomer: { id: props.customer.id },
    }),
  });
  return created;
}
