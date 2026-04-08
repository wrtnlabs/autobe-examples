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
import { EcommerceCartItemCollector } from "../collectors/EcommerceCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartItemTransformer } from "../transformers/EcommerceCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IEcommerceCartItem.ICreate;
}): Promise<IEcommerceCartItem> {
  // 1. Validate cart exists and belongs to customer
  const cart = await MyGlobal.prisma.ecommerce_carts.findUniqueOrThrow({
    where: { id: props.cartId, deleted_at: null },
    select: { id: true, ecommerce_customer_id: true },
  });
  if (cart.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate product variant exists and is not deleted
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findUnique({
    where: { id: props.body.ecommerce_product_variant_id, deleted_at: null },
    select: { id: true },
  });
  if (variant === null) {
    throw new HttpException("Product variant not found", 404);
  }
  // 3. Check stock availability from inventory records
  const inventory = await MyGlobal.prisma.ecommerce_inventory_records.aggregate(
    {
      where: {
        ecommerce_product_variant_id: props.body.ecommerce_product_variant_id,
        deleted_at: null,
      },
      _sum: { quantity_change: true },
    },
  );
  const stock = inventory._sum?.quantity_change ?? 0;
  if (stock <= 0) {
    throw new HttpException("Product variant is out of stock", 400);
  }
  // 4. Check if variant already in cart
  const existingItem = await MyGlobal.prisma.ecommerce_cart_items.findFirst({
    where: {
      ecommerce_cart_id: props.cartId,
      ecommerce_product_variant_id: props.body.ecommerce_product_variant_id,
      deleted_at: null,
    },
  });
  if (existingItem !== null) {
    // Increment quantity
    await MyGlobal.prisma.ecommerce_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + props.body.quantity,
        updated_at: new Date(),
      },
    });
  } else {
    // Create new cart item
    await MyGlobal.prisma.ecommerce_cart_items.create({
      data: await EcommerceCartItemCollector.collect({
        body: props.body,
        ecommerceCarts: cart,
      }),
    });
  }
  // 5. Return the cart item
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findUniqueOrThrow(
    {
      where: {
        ecommerce_cart_id_ecommerce_product_variant_id: {
          ecommerce_cart_id: props.cartId,
          ecommerce_product_variant_id: props.body.ecommerce_product_variant_id,
        },
      },
      ...EcommerceCartItemTransformer.select(),
    },
  );
  return await EcommerceCartItemTransformer.transform(cartItem);
}
