import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallOrderCollector } from "../collectors/EcommerceMallOrderCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersMeOrders(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrder.ICreate;
}): Promise<IEcommerceMallOrder> {
  // Step 1: Validate shipping address ownership and active status
  const address =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
      where: {
        id: props.body.shippingAddressId,
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (!address) {
    throw new HttpException("Invalid or unauthorized shipping address", 400);
  }
  // Step 2: Get cart items with product and variant data using explicit select
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      cart: { ecommerce_mall_customer_id: props.customer.id },
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
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              base_price: true,
              deleted_at: true,
              category: {
                select: { name: true },
              },
              seller: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Step 3: Collect unique seller IDs to fetch profiles
  const sellerIds = [
    ...new Set(cartItems.map((ci) => ci.productVariant.product.seller.id)),
  ];
  const sellerProfiles =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findMany({
      where: { seller_id: { in: sellerIds } },
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        seller_id: true,
      },
    });
  const sellerProfileMap = new Map(
    sellerProfiles.map((sp) => [sp.seller_id, sp]),
  );
  // Step 4: Validate each cart item and prepare order items data
  const orderItemsData: Array<{
    productSnapshotId: string & tags.Format<"uuid">;
    sellerProfileSnapshotId: string & tags.Format<"uuid">;
    productVariantId: string & tags.Format<"uuid">;
    quantity: number & tags.Type<"int32">;
    unitPrice: number;
    totalPrice: number;
    variantCurrentQuantity: number;
    productSnapshotData: {
      name: string;
      description: string;
      basePrice: number;
      categoryName: string;
      productId: string & tags.Format<"uuid">;
      sellerId: string & tags.Format<"uuid">;
    };
    sellerProfileSnapshotData: {
      shopName: string;
      shopDescription: string | null;
      logoUrl: string | null;
      sellerProfileId: string & tags.Format<"uuid">;
    };
  }> = [];
  for (const cartItem of cartItems) {
    const variant = cartItem.productVariant;
    const product = variant.product;
    const sellerId = product.seller.id;
    const sellerProfile = sellerProfileMap.get(sellerId);
    const category = product.category;
    // Validate product is not soft-deleted
    if (product.deleted_at !== null) {
      throw new HttpException(
        `Product "${product.name}" is no longer available`,
        400,
      );
    }
    // Validate variant is not soft-deleted
    if (variant.deleted_at !== null) {
      throw new HttpException(
        `Product variant "${variant.sku_code}" is no longer available`,
        400,
      );
    }
    // Validate sufficient stock
    if (variant.quantity < cartItem.quantity) {
      throw new HttpException(
        `Insufficient stock for variant "${variant.sku_code}". Available: ${variant.quantity}, Requested: ${cartItem.quantity}`,
        400,
      );
    }
    // Calculate unit price (variant price override or product base price)
    const unitPrice =
      variant.price !== null ? variant.price : product.base_price;
    const totalPrice = unitPrice * cartItem.quantity;
    orderItemsData.push({
      productSnapshotId: v4(),
      sellerProfileSnapshotId: v4(),
      productVariantId: variant.id,
      quantity: cartItem.quantity as number & tags.Type<"int32">,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      variantCurrentQuantity: variant.quantity,
      productSnapshotData: {
        name: product.name,
        description: product.description,
        basePrice: product.base_price,
        categoryName: category.name,
        productId: product.id,
        sellerId: sellerId,
      },
      sellerProfileSnapshotData: {
        shopName: sellerProfile?.name ?? "Unknown Shop",
        shopDescription: sellerProfile?.description ?? null,
        logoUrl: sellerProfile?.logo_uri ?? null,
        sellerProfileId: sellerProfile?.id ?? v4(),
      },
    });
  }
  // Step 5: Create product and seller profile snapshots
  const now = new Date();
  for (const item of orderItemsData) {
    // Create product snapshot
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
      data: {
        id: item.productSnapshotId,
        name: item.productSnapshotData.name,
        description: item.productSnapshotData.description,
        base_price: item.productSnapshotData.basePrice,
        category_name: item.productSnapshotData.categoryName,
        ecommerce_mall_product_id: item.productSnapshotData.productId,
        ecommerce_mall_seller_id: item.productSnapshotData.sellerId,
        created_at: now,
      },
    });
    // Create seller profile snapshot
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.create({
      data: {
        id: item.sellerProfileSnapshotId,
        shop_name: item.sellerProfileSnapshotData.shopName,
        shop_description: item.sellerProfileSnapshotData.shopDescription,
        logo_url: item.sellerProfileSnapshotData.logoUrl,
        ecommerce_mall_seller_profile_id:
          item.sellerProfileSnapshotData.sellerProfileId,
        created_at: now,
      },
    });
  }
  // Step 6: Calculate order totals
  const subtotal = orderItemsData.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );
  const shippingCost = subtotal >= 100 ? 0 : 10;
  const totalAmount = subtotal + shippingCost;
  // Step 7: Create the order using collector
  const order = await MyGlobal.prisma.ecommerce_mall_orders.create({
    data: await EcommerceMallOrderCollector.collect({
      body: props.body,
      customer: props.customer,
      subtotal: subtotal,
      shippingCost: shippingCost,
      totalAmount: totalAmount,
      orderItems: orderItemsData.map((item) => ({
        productSnapshotId: item.productSnapshotId,
        sellerProfileSnapshotId: item.sellerProfileSnapshotId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    }),
    ...EcommerceMallOrderTransformer.select(),
  });
  // Step 8: Create inventory deduction records and update variant quantities
  for (const item of orderItemsData) {
    // Create inventory record
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_mall_product_variant_id: item.productVariantId,
        quantity_change: -item.quantity,
        reason: "order",
        created_at: now,
      },
    });
    // Update variant quantity
    await MyGlobal.prisma.ecommerce_mall_product_variants.update({
      where: { id: item.productVariantId },
      data: { quantity: item.variantCurrentQuantity - item.quantity },
    });
  }
  // Step 9: Clear cart items
  await MyGlobal.prisma.ecommerce_mall_cart_items.deleteMany({
    where: { id: { in: cartItems.map((ci) => ci.id) } },
  });
  // Step 10: Return transformed order
  return await EcommerceMallOrderTransformer.transform(order);
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
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
// import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersMeOrders(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallOrder.ICreate;
// }): Promise<IEcommerceMallOrder> {
//   const record = await MyGlobal.prisma.ecommerce_mall_orders.create({
//     data: await EcommerceMallOrderCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallOrderTransformer.select(),
//   });
//   return await EcommerceMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------