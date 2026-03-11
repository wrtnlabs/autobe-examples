import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCartValidationWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartValidationWarning";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCart(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallCartItem.IAtResponse> {
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      user_id: props.customer.id,
    },
    include: {
      customer: true,
      variant: {
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          stock_quantity: true,
          product: {
            select: {
              id: true,
              seller_id: true,
              deleted_at: true,
              is_available: true,
              name: true,
              base_price: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });
  const items: IEcommerceMallCartItem[] = [];
  const validationWarnings: IEcommerceMallCartValidationWarning[] = [];
  let totalAmount = 0;
  for (const cartItem of cartItems) {
    const variant = cartItem.variant;
    if (!variant) {
      continue;
    }
    const product = variant.product;
    if (!product) {
      continue;
    }
    const unitPrice = variant.price_override ?? product.base_price ?? 0;
    const subtotal = unitPrice * cartItem.quantity;
    totalAmount += subtotal;
    let isAvailable = true;
    const warnings: IEcommerceMallCartValidationWarning[] = [];
    const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
      where: { id: product.seller_id },
      select: { is_suspended: true },
    });
    if (seller?.is_suspended) {
      isAvailable = false;
      warnings.push({
        warningType: "seller_suspended",
        message: `Product "${product.name}" is unavailable because the seller is suspended`,
        affectedFields: ["variant_id"],
      });
    }
    if (product.deleted_at !== null) {
      isAvailable = false;
      warnings.push({
        warningType: "product_deleted",
        message: `Product "${product.name}" has been deleted`,
        affectedFields: ["variant_id"],
      });
    }
    if (variant.stock_quantity <= 0) {
      isAvailable = false;
      warnings.push({
        warningType: "variant_no_longer_exists",
        message: `Variant "${variant.sku_code}" is no longer available (out of stock)`,
        affectedFields: ["variant_id"],
      });
    } else if (variant.stock_quantity < cartItem.quantity) {
      warnings.push({
        warningType: "low_stock",
        message: `Only ${variant.stock_quantity} units available (your quantity: ${cartItem.quantity})`,
        affectedFields: ["quantity"],
      });
    }
    validationWarnings.push(...warnings);
    items.push({
      id: cartItem.id,
      user_id: cartItem.user_id,
      variant_id: cartItem.variant_id,
      quantity: cartItem.quantity,
      subtotal,
      is_available: isAvailable,
      created_at: toISOStringSafe(cartItem.created_at),
      updated_at: toISOStringSafe(cartItem.updated_at),
      user: {
        id: cartItem.customer.id,
        email: cartItem.customer.email,
        is_suspended: false,
        created_at: toISOStringSafe(cartItem.customer.created_at ?? null),
      },
      variant: {
        id: variant.id,
        sku_code: variant.sku_code,
        price_override: variant.price_override,
        stock_quantity: variant.stock_quantity,
      },
    });
  }
  return {
    items,
    total_amount: totalAmount,
    validation_warnings: validationWarnings,
  };
}
