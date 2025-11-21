import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Validate cart exists and is active
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
      status: "active",
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found or not active", 404);
  }

  // Fetch product variant to get price and inventory
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: props.body.productVariantId,
        deleted_at: null,
      },
    });

  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }

  // Determine cart item status based on inventory
  const status: "active" | "out_of_stock" =
    variant.inventory_count > 0 ? "active" : "out_of_stock";

  // Create cart item with captured price and timestamp
  const createdCartItem = await MyGlobal.prisma.shopping_mall_cart_items.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_cart_id: props.cartId,
        shopping_mall_product_variant_id: props.body.productVariantId,
        price: variant.price,
        quantity: 1, // Default since not provided in ICreate
        status,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    price: createdCartItem.price,
  };
}
