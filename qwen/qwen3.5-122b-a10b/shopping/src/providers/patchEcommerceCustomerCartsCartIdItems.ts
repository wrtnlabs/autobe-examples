import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartItemAtSummaryTransformer } from "../transformers/EcommerceCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IEcommerceCartItem.IUpdate;
}): Promise<IEcommerceCartItem.ISummary> {
  // Step 1: Validate cart exists and belongs to the customer
  const cart = await MyGlobal.prisma.ecommerce_carts.findUnique({
    where: { id: props.cartId },
    select: { id: true, ecommerce_customer_id: true },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Find the cart item to update
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findFirst({
    where: {
      ecommerce_cart_id: props.cartId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_product_variant_id: true,
      quantity: true,
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  // Step 3: Validate product variant exists and product is active
  const productVariant =
    await MyGlobal.prisma.ecommerce_product_variants.findUnique({
      where: { id: cartItem.ecommerce_product_variant_id },
      select: {
        id: true,
        product: {
          select: {
            id: true,
            deleted_at: true,
          },
        },
      },
    });
  if (!productVariant) {
    throw new HttpException("Product variant not found", 404);
  }
  if (productVariant.product.deleted_at !== null) {
    throw new HttpException("Product is deleted", 400);
  }
  // Step 4: Update the cart item
  const updateData: Prisma.ecommerce_cart_itemsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.quantity !== undefined) {
    updateData.quantity = props.body.quantity;
    if (props.body.quantity <= 0) {
      updateData.deleted_at = new Date();
    }
  }
  const updated = await MyGlobal.prisma.ecommerce_cart_items.update({
    where: { id: cartItem.id },
    data: updateData,
  });
  // Step 5: Fetch the updated cart item with all required relations for transformation
  const record = await MyGlobal.prisma.ecommerce_cart_items.findUniqueOrThrow({
    where: { id: updated.id },
    ...EcommerceCartItemAtSummaryTransformer.select(),
  });
  return await EcommerceCartItemAtSummaryTransformer.transform(record);
}
