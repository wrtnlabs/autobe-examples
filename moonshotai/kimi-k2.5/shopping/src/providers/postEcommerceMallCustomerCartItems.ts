import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCartItemCollector } from "../collectors/EcommerceMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // Verify the product variant exists and is not deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.body.productVariantId },
      select: { id: true, deleted_at: true },
    });
  if (variant === null || variant.deleted_at !== null) {
    throw new HttpException("Product variant not found", 404);
  }
  // Check if cart item already exists for this customer + variant combination
  const existingCartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
      where: {
        customer_id: props.customer.id,
        product_variant_id: props.body.productVariantId,
        deleted_at: null,
      },
      select: {
        id: true,
        quantity: true,
      },
    });
  let cartItemId: string;
  if (existingCartItem !== null) {
    // Combine quantities as per duplicate handling requirement (section 363)
    const combinedQuantity = existingCartItem.quantity + props.body.quantity;
    await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingCartItem.id },
      data: {
        quantity: combinedQuantity,
        updated_at: new Date(),
      },
    });
    cartItemId = existingCartItem.id;
  } else {
    // Create new cart item using collector
    const newCartItemData = await EcommerceMallCartItemCollector.collect({
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
      ecommerceMallCustomerSessions: { id: props.customer.session_id },
    });
    const created = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: newCartItemData,
      select: { id: true },
    });
    cartItemId = created.id;
  }
  // Retrieve the cart item with full joins for transformation
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: cartItemId },
      ...EcommerceMallCartItemTransformer.select(),
    });
  return await EcommerceMallCartItemTransformer.transform(cartItem);
}
