import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCheckoutPrepare } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutPrepare";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductVariantAtOptionTransformer } from "../transformers/ShoppingMallProductVariantAtOptionTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCustomersMeCheckoutPrepare(props: {
  customer: CustomerPayload;
  body: IShoppingMallCheckoutPrepare.IRequest;
}): Promise<IShoppingMallCheckoutPrepare> {
  // Query cart items with related data
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      shopping_customer_id: props.customer.id,
    },
    select: {
      id: true,
      quantity: true,
      unit_price: true,
      created_at: true,
      variant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          deleted_at: true,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              deleted_at: true,
              seller: ShoppingMallSellerAtSummaryTransformer.select(),
            },
          },
          options: ShoppingMallProductVariantAtOptionTransformer.select(),
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  });
  // Batch fetch inventory for all variants
  const variantIds = cartItems.map((item) => item.variant.id);
  const inventoryRecords =
    await MyGlobal.prisma.shopping_mall_product_inventory_histories.findMany({
      where: {
        shopping_mall_product_variant_id: { in: variantIds },
      },
      select: {
        shopping_mall_product_variant_id: true,
        quantity_change: true,
      },
    });
  // Calculate stock per variant
  const stockMap = new Map<string, number>();
  for (const record of inventoryRecords) {
    const current = stockMap.get(record.shopping_mall_product_variant_id) ?? 0;
    stockMap.set(
      record.shopping_mall_product_variant_id,
      current + record.quantity_change,
    );
  }
  const items: IShoppingMallCheckoutPrepare.IItem[] = [];
  const warnings: string[] = [];
  for (const cartItem of cartItems) {
    const variant = cartItem.variant;
    const product = variant.product;
    const seller = product.seller;
    // Check availability
    const variantDeleted = variant.deleted_at !== null;
    const productDeleted = product.deleted_at !== null;
    const sellerDeleted = seller.deleted_at !== null;
    const sellerNotApproved = seller.approval_status !== "approved";
    const unavailable =
      variantDeleted || productDeleted || sellerNotApproved || sellerDeleted;
    // Calculate stock
    const stock = stockMap.get(variant.id) ?? 0;
    const displayStock = Math.max(0, stock);
    const inStock = stock >= cartItem.quantity;
    // Calculate prices
    const unitPrice = variant.price ?? product.base_price;
    const lineSubtotal = unitPrice * cartItem.quantity;
    // Transform seller using transformer
    const sellerSummary =
      await ShoppingMallSellerAtSummaryTransformer.transform(seller);
    // Transform variant options using transformer
    const variantOptions = await ArrayUtil.asyncMap(
      variant.options,
      ShoppingMallProductVariantAtOptionTransformer.transform,
    );
    // Generate warnings
    if (variantDeleted) {
      warnings.push(`Variant no longer available: ${product.name}`);
    }
    if (productDeleted) {
      warnings.push(`Product no longer available: ${product.name}`);
    }
    if (sellerNotApproved || sellerDeleted) {
      warnings.push(`Seller suspended: ${seller.shop_name}`);
    }
    if (!unavailable && stock <= 0) {
      warnings.push(`Out of stock: ${product.name}`);
    } else if (!unavailable && stock < cartItem.quantity) {
      warnings.push(
        `Insufficient stock: only ${displayStock} available for ${product.name}`,
      );
    }
    items.push({
      id: cartItem.id,
      in_stock: inStock,
      product_name: product.name,
      quantity: cartItem.quantity,
      seller: sellerSummary,
      stock: displayStock,
      subtotal: lineSubtotal,
      unavailable,
      unit_price: unitPrice,
      variant_options: variantOptions,
      variant_sku_code: variant.sku_code,
    } satisfies IShoppingMallCheckoutPrepare.IItem);
  }
  // Calculate validity and subtotal for available items with stock
  const validItems = items.filter((item) => !item.unavailable && item.in_stock);
  const valid = validItems.length > 0;
  const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
  // Note: Customer addresses would typically come from a separate customer_addresses table
  // Based on the schema, order_addresses are snapshots created at order time
  // The addresses field in the response appears to be for saved customer addresses
  // which may need a separate implementation or table
  const addresses: IShoppingMallOrderAddress.ISummary[] = [];
  const defaultAddressId: string | null = null;
  return {
    valid,
    items,
    warnings,
    subtotal,
    addresses,
    defaultAddressId,
  } satisfies IShoppingMallCheckoutPrepare;
}
