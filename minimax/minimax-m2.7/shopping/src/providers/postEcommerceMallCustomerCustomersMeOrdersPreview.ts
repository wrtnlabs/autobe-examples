import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function postEcommerceMallCustomerCustomersMeOrdersPreview(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrder.IPreviewRequest;
}): Promise<IEcommerceMallOrder.IPreview> {
  // Validate shipping address belongs to the customer
  const shippingAddress =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
      where: {
        id: props.body.shippingAddressId,
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      ...EcommerceMallShippingAddressAtSummaryTransformer.select(),
    });
  if (!shippingAddress) {
    throw new HttpException(
      "Shipping address not found or does not belong to customer",
      404,
    );
  }
  // Retrieve customer's cart with cart items
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findFirst({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
    },
    include: {
      cartItems: {
        include: {
          productVariant: {
            include: {
              product: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      email: true,
                      approval_status: true,
                      rejection_reason: true,
                      rejected_at: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                  category: {
                    select: { name: true },
                  },
                  variants: {
                    include: {
                      inventoryRecords: {
                        select: { quantity_change: true },
                      },
                    },
                  },
                },
              },
              inventoryRecords: {
                select: { quantity_change: true },
              },
            },
          },
        },
      },
    },
  });
  if (!cart || cart.cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Validate each cart item and compute preview items
  const validatedItems: IEcommerceMallOrder.IPreviewItem[] = [];
  let hasWarnings = false;
  let subtotal = 0;
  for (const cartItem of cart.cartItems) {
    const variant = cartItem.productVariant;
    const product = variant.product;
    const seller = product.seller;
    // Check variant availability
    const isVariantAvailable = variant.deleted_at === null;
    // Check product availability
    const isProductAvailable = product.deleted_at === null;
    // Check seller status
    const isSellerApproved = seller.approval_status === "approved";
    const isSellerDeleted = seller.deleted_at !== null;
    // Check for active suspension (restored_at is null means still suspended)
    const activeSuspension =
      await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findFirst({
        where: {
          ecommerce_mall_seller_id: seller.id,
          restored_at: null,
        },
      });
    const isSellerSuspended = activeSuspension !== null;
    // Calculate available quantity from inventory records
    const availableQuantity = variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    // Check if stock warning is needed
    const hasStockWarning =
      !isVariantAvailable ||
      !isProductAvailable ||
      !isSellerApproved ||
      isSellerDeleted ||
      isSellerSuspended ||
      availableQuantity < cartItem.quantity;
    if (hasStockWarning) {
      hasWarnings = true;
    }
    // Calculate unit price and line total
    const unitPrice =
      variant.price !== null ? variant.price : product.base_price;
    const lineTotal = unitPrice * cartItem.quantity;
    subtotal += lineTotal;
    // Determine if product has stock
    const productHasStock = product.variants.some((v) => {
      const variantQty = v.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      );
      return variantQty > 0;
    });
    // Build preview item
    const previewItem: IEcommerceMallOrder.IPreviewItem = {
      availableQuantity: Math.max(0, availableQuantity),
      hasStockWarning: hasStockWarning,
      id: cartItem.id as string & tags.Format<"uuid">,
      lineTotal: lineTotal,
      product: {
        id: product.id as string & tags.Format<"uuid">,
        name: product.name,
        basePrice: Number(product.base_price),
        categoryName: product.category.name,
        hasStock: productHasStock,
        seller: {
          approvalStatus: seller.approval_status,
          createdAt: toISOStringSafe(seller.created_at),
          email: seller.email as string & tags.Format<"email">,
          id: seller.id as string & tags.Format<"uuid">,
          rejectedAt:
            seller.rejected_at !== null
              ? toISOStringSafe(seller.rejected_at)
              : null,
          rejectionReason: seller.rejection_reason,
          shopName: null,
          suspensionStatus: isSellerSuspended ? "suspended" : "active",
        },
        createdAt: toISOStringSafe(product.created_at),
        updatedAt: toISOStringSafe(product.updated_at),
      },
      quantity: cartItem.quantity,
      unitPrice: unitPrice,
      variant: {
        id: variant.id as string & tags.Format<"uuid">,
        skuCode: variant.sku_code,
        price: variant.price,
        quantity: variant.quantity,
        productId: product.id as string & tags.Format<"uuid">,
        createdAt: toISOStringSafe(variant.created_at),
        updatedAt: toISOStringSafe(variant.updated_at),
      },
    };
    validatedItems.push(previewItem);
  }
  // Calculate shipping cost based on destination
  const shippingCost = calculateShippingCost(shippingAddress.country);
  const totalAmount = subtotal + shippingCost;
  // Generate temporary order number
  const orderNumber = `PREVIEW-${v4().split("-")[0]}`;
  // Return order preview with transformer.transform() called
  return {
    orderNumber: orderNumber,
    items: validatedItems,
    subtotal: subtotal,
    shippingCost: shippingCost,
    totalAmount: totalAmount,
    shippingAddress:
      await EcommerceMallShippingAddressAtSummaryTransformer.transform(
        shippingAddress,
      ),
    hasWarnings: hasWarnings,
  };
}
function calculateShippingCost(country: string): number {
  const internationalCountries = [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Japan",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "Netherlands",
  ];
  return internationalCountries.includes(country) ? 15.0 : 5.0;
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
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersMeOrdersPreview(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallOrder.IPreviewRequest;
// }): Promise<IEcommerceMallOrder.IPreview> {
//   return {
//     orderNumber: ...,
//     items: ...,
//     subtotal: ...,
//     shippingCost: ...,
//     totalAmount: ...,
//     shippingAddress: await EcommerceMallShippingAddressAtSummaryTransformer.transform(...),
//     hasWarnings: ...,
//   };
// }
// ```
//--------------------------------------------------------------