import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEcommerceMallCheckoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutItem";
import { IEcommerceMallCheckoutItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutItemVariantOption";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "../transformers/EcommerceMallShippingAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCustomersMeCheckout(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallCheckout.ISummary> {
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findFirst({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
    },
  });
  if (!cart) {
    const addresses =
      await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findMany({
        where: {
          ecommerce_mall_customer_id: props.customer.id,
          deleted_at: null,
        },
        ...EcommerceMallShippingAddressAtSummaryTransformer.select(),
      });
    return {
      items: [],
      addresses: await ArrayUtil.asyncMap(
        addresses,
        EcommerceMallShippingAddressAtSummaryTransformer.transform,
      ),
      summary: {
        grandTotal: 0,
        totalItems: 0,
        validItemsCount: 0,
        unavailableItemsCount: 0,
      },
    };
  }
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      ecommerce_mall_cart_id: cart.id,
    },
    select: {
      id: true,
      quantity: true,
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          quantity: true,
          deleted_at: true,
          optionValues: {
            select: {
              key: true,
              value: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              deleted_at: true,
              productImages: {
                where: {
                  display_order: 0,
                },
                select: {
                  image_url: true,
                },
              },
            },
          },
        },
      },
    },
  });
  let grandTotal = 0;
  let validItemsCount = 0;
  let unavailableItemsCount = 0;
  const validatedItems = await ArrayUtil.asyncMap(cartItems, async (item) => {
    const variant = item.productVariant;
    const product = variant.product;
    let status: "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";
    let availableQuantity: number;
    let unitPrice: number;
    let subtotal: number;
    if (variant.deleted_at !== null || product.deleted_at !== null) {
      status = "UNAVAILABLE";
      availableQuantity = 0;
      unitPrice = variant.price ?? product.base_price;
      subtotal = 0;
      unavailableItemsCount++;
    } else if (variant.quantity < item.quantity) {
      status = "OUT_OF_STOCK";
      availableQuantity = variant.quantity;
      unitPrice = variant.price ?? product.base_price;
      subtotal = 0;
      unavailableItemsCount++;
    } else {
      status = "AVAILABLE";
      availableQuantity = variant.quantity;
      unitPrice = variant.price ?? product.base_price;
      subtotal = item.quantity * unitPrice;
      grandTotal += subtotal;
      validItemsCount++;
    }
    const optionValues = variant.optionValues;
    const variantName =
      optionValues.length > 0
        ? `${product.name} - ${optionValues.map((o) => o.value).join(" - ")}`
        : product.name;
    const thumbnail = variant.product.productImages[0]?.image_url ?? null;
    return {
      id: item.id,
      quantity: item.quantity,
      status,
      availableQuantity,
      unitPrice,
      subtotal,
      variant: {
        id: variant.id,
        skuCode: variant.sku_code,
        name: variantName,
        options:
          optionValues satisfies IEcommerceMallCheckoutItemVariantOption[],
        basePrice: unitPrice,
      } satisfies IEcommerceMallCheckoutItem.IVariant,
      product: {
        id: product.id,
        name: product.name,
      } satisfies IEcommerceMallCheckoutItem.IProduct,
    } satisfies IEcommerceMallCheckout.ISummary.IItem;
  });
  const addresses =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      ...EcommerceMallShippingAddressAtSummaryTransformer.select(),
    });
  return {
    items: validatedItems,
    addresses: await ArrayUtil.asyncMap(
      addresses,
      EcommerceMallShippingAddressAtSummaryTransformer.transform,
    ),
    summary: {
      grandTotal,
      totalItems: cartItems.length,
      validItemsCount,
      unavailableItemsCount,
    },
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
// import { IEcommerceMallCheckoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutItem";
// import { IEcommerceMallCheckoutItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutItemVariantOption";
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCustomersMeCheckout(props: {
//   customer: CustomerPayload;
// }): Promise<IEcommerceMallCheckout.ISummary> {
//   return {
//     items: ...,
//     addresses: await ArrayUtil.asyncMap(..., (r) => EcommerceMallShippingAddressAtSummaryTransformer.transform(r)),
//     summary: ...,
//   };
// }
// ```
//--------------------------------------------------------------