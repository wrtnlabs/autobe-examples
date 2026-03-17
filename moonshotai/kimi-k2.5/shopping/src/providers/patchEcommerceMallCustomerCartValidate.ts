import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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

export async function patchEcommerceMallCustomerCartValidate(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.IValidate;
}): Promise<IEcommerceMallCartItem.IValidationResult> {
  // Query cart items for this customer with all necessary relations
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
      ...(props.body.itemIds && props.body.itemIds.length > 0
        ? { id: { in: props.body.itemIds } }
        : {}),
    },
    select: {
      id: true,
      quantity: true,
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          deleted_at: true,
          created_at: true,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              deleted_at: true,
            },
          } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
          variantOptions: {
            select: {
              id: true,
              option_name: true,
              option_value: true,
            },
          } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs,
          inventoryRecords: {
            select: {
              quantity_change: true,
            },
          } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
        },
      } satisfies Prisma.ecommerce_mall_product_variantsDefaultArgs,
    },
  });
  const validatedItems: IEcommerceMallCartItem.IValidatedItem[] = [];
  let isValid = true;
  let totalPrice = 0;
  for (const item of cartItems) {
    const variant = item.productVariant;
    const product = variant.product;
    // Calculate current stock from inventory records
    const currentStock = variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    // Determine availability: variant must exist, not be deleted, and product must be active
    const variantIsActive = variant.deleted_at === null;
    const productIsActive = product.deleted_at === null;
    const isAvailable = variantIsActive && productIsActive;
    // Determine if quantity requirement can be met
    const quantityMeetsStock = currentStock >= item.quantity;
    const itemIsValid = isAvailable && quantityMeetsStock;
    // Build appropriate warning message
    let warning: string | null = null;
    if (!variantIsActive) {
      warning = "Product variant is no longer available";
    } else if (!productIsActive) {
      warning = "Product has been deleted";
    } else if (!quantityMeetsStock) {
      warning = `Insufficient stock (requested: ${item.quantity}, available: ${currentStock})`;
    }
    // Calculate unit price and subtotal
    const unitPrice = variant.price ?? product.base_price;
    const subtotal = itemIsValid ? item.quantity * unitPrice : 0;
    // Auto-adjust quantity if enabled and stock is insufficient but available
    let finalQuantity = item.quantity;
    if (
      props.body.autoAdjustQuantities === true &&
      isAvailable &&
      currentStock < item.quantity
    ) {
      finalQuantity = currentStock > 0 ? currentStock : 0;
      await MyGlobal.prisma.ecommerce_mall_cart_items.update({
        where: { id: item.id },
        data: {
          quantity: finalQuantity,
          updated_at: new Date(),
        },
      });
      // Update warning to reflect adjustment
      if (finalQuantity === 0) {
        warning = "Item removed due to zero stock availability";
      } else {
        warning = `Quantity adjusted from ${item.quantity} to ${finalQuantity} due to stock limitation`;
      }
    }
    // Build product variant summary with options
    const productVariant: IEcommerceMallProductVariant.ISummary = {
      id: variant.id,
      skuCode: variant.sku_code,
      price: variant.price ?? null,
      options: variant.variantOptions.map((opt) => ({
        id: opt.id,
        optionName: opt.option_name,
        optionValue: opt.option_value,
      })),
      currentStock,
      isAvailable,
      createdAt: variant.created_at.toISOString(),
    };
    validatedItems.push({
      id: item.id,
      productVariant,
      quantity: finalQuantity,
      isValid: itemIsValid,
      isAvailable,
      availableQuantity: currentStock,
      warning,
      unitPrice,
      subtotal,
    });
    if (!itemIsValid) {
      isValid = false;
    }
    if (itemIsValid) {
      totalPrice += subtotal;
    }
  }
  return {
    items: validatedItems,
    isValid,
    totalPrice,
  } satisfies IEcommerceMallCartItem.IValidationResult;
}
