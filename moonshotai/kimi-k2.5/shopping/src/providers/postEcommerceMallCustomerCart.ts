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

export async function postEcommerceMallCustomerCart(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  const now = new Date();
  // Check if variant exists and is available
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.body.productVariantId,
        deleted_at: null,
      },
      select: {
        id: true,
        product: {
          select: {
            seller: {
              select: {
                approval_status: true,
              },
            },
          },
        },
      },
    });
  if (variant === null) {
    throw new HttpException("Product variant not found", 404);
  }
  if (variant.product.seller.approval_status !== "approved") {
    throw new HttpException(
      "Product variant is not available for purchase",
      400,
    );
  }
  // Check if item already exists in cart
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
      where: {
        customer_id: props.customer.id,
        product_variant_id: props.body.productVariantId,
        deleted_at: null,
      },
      ...EcommerceMallCartItemTransformer.select(),
    });
  let result: EcommerceMallCartItemTransformer.Payload;
  if (existingItem !== null) {
    // Combine quantities
    const newQuantity = existingItem.quantity + props.body.quantity;
    await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQuantity,
        updated_at: now,
      },
    });
    // Fetch updated item
    result = await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: existingItem.id },
      ...EcommerceMallCartItemTransformer.select(),
    });
  } else {
    // Create new cart item using collector
    const createData = await EcommerceMallCartItemCollector.collect({
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
      ecommerceMallCustomerSessions: { id: props.customer.session_id },
    });
    result = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: createData,
      ...EcommerceMallCartItemTransformer.select(),
    });
  }
  return await EcommerceMallCartItemTransformer.transform(result);
}
