import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersCheckout(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrder.ICreate;
}): Promise<IEcommerceMallOrder> {
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findUniqueOrThrow({
    where: { ecommerce_mall_customer_id: props.customer.id },
    select: {
      id: true,
      cartItems: {
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
                  category: { select: { name: true } },
                  seller: { select: { id: true } },
                  productImages: {
                    select: { image_url: true },
                    orderBy: { display_order: "asc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (cart.cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  const unavailableItems = cart.cartItems.filter(
    (item) =>
      item.productVariant.deleted_at !== null ||
      item.productVariant.product.deleted_at !== null ||
      item.productVariant.quantity < item.quantity,
  );
  if (unavailableItems.length > 0) {
    throw new HttpException("Cannot checkout with unavailable items", 400);
  }
  let shippingAddressId: string;
  if (props.body.shippingAddressId) {
    const address =
      await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
        where: {
          id: props.body.shippingAddressId,
          ecommerce_mall_customer_id: props.customer.id,
          deleted_at: null,
        },
      });
    if (!address) {
      throw new HttpException("Shipping address not found", 404);
    }
    shippingAddressId = address.id;
  } else {
    const defaultAddress =
      await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
        where: {
          ecommerce_mall_customer_id: props.customer.id,
          is_default: true,
          deleted_at: null,
        },
      });
    if (!defaultAddress) {
      throw new HttpException("No default shipping address found", 400);
    }
    shippingAddressId = defaultAddress.id;
  }
  const subtotal = cart.cartItems.reduce((sum, item) => {
    const unitPrice =
      item.productVariant.price ?? item.productVariant.product.base_price;
    return sum + unitPrice * item.quantity;
  }, 0);
  const totalQuantity = cart.cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const shippingCost = subtotal >= 50000 ? 0 : totalQuantity * 3000;
  const totalAmount = subtotal + shippingCost;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orderNumber = `ORD-${timestamp}-${random}`;
  const productMap = new Map<
    string,
    {
      name: string;
      description: string;
      basePrice: number;
      categoryName: string;
      sellerId: string;
      imageUrl: string;
    }
  >();
  const sellerMap = new Map<string, string>();
  for (const item of cart.cartItems) {
    const product = item.productVariant.product;
    if (!productMap.has(product.id)) {
      productMap.set(product.id, {
        name: product.name,
        description: product.description,
        basePrice: product.base_price,
        categoryName: product.category.name,
        sellerId: product.seller.id,
        imageUrl: product.productImages[0]?.image_url ?? "",
      });
    }
    if (!sellerMap.has(product.seller.id)) {
      sellerMap.set(product.seller.id, product.seller.id);
    }
  }
  const sellerProfileSnapshots = new Map<string, string>();
  for (const sellerId of sellerMap.keys()) {
    const profile =
      await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirst({
        where: { seller_id: sellerId },
        select: { id: true, name: true, description: true, logo_uri: true },
      });
    if (profile) {
      const snapshotId = v4();
      await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.create({
        data: {
          id: snapshotId,
          ecommerce_mall_seller_profile_id: profile.id,
          shop_name: profile.name,
          shop_description: profile.description,
          logo_url: profile.logo_uri,
          created_at: new Date(),
        },
      });
      sellerProfileSnapshots.set(sellerId, snapshotId);
    }
  }
  const productSnapshots = new Map<string, string>();
  for (const [productId, productData] of productMap) {
    const snapshotId = v4();
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        ecommerce_mall_product_id: productId,
        ecommerce_mall_seller_id: productData.sellerId,
        name: productData.name,
        description: productData.description,
        base_price: productData.basePrice,
        category_name: productData.categoryName,
        created_at: new Date(),
      },
    });
    productSnapshots.set(productId, snapshotId);
  }
  const orderId = v4();
  const now = new Date();
  const order = await MyGlobal.prisma.ecommerce_mall_orders.create({
    data: {
      id: orderId,
      ecommerce_mall_customer_id: props.customer.id,
      ecommerce_mall_shipping_address_id: shippingAddressId,
      order_number: orderNumber,
      subtotal: subtotal,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      status: "paid",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  for (const item of cart.cartItems) {
    const product = item.productVariant.product;
    const unitPrice = item.productVariant.price ?? product.base_price;
    const productSnapshotId = productSnapshots.get(product.id);
    const sellerProfileSnapshotId = sellerProfileSnapshots.get(
      product.seller.id,
    );
    if (productSnapshotId && sellerProfileSnapshotId) {
      await MyGlobal.prisma.ecommerce_mall_order_items.create({
        data: {
          id: v4(),
          ecommerce_mall_order_id: orderId,
          ecommerce_mall_product_id: product.id,
          ecommerce_mall_product_variant_id: item.productVariant.id,
          ecommerce_mall_product_snapshot_id: productSnapshotId,
          ecommerce_mall_seller_profile_snapshot_id: sellerProfileSnapshotId,
          quantity: item.quantity,
          unit_price: unitPrice,
          status: "paid",
          created_at: now,
          updated_at: now,
        },
      });
    }
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_cart_items.deleteMany({
      where: { ecommerce_mall_cart_id: cart.id },
    }),
    ...cart.cartItems.map((item) =>
      MyGlobal.prisma.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          ecommerce_mall_product_variant_id: item.productVariant.id,
          quantity_change: -item.quantity,
          reason: "order_placement",
          created_at: now,
        },
      }),
    ),
  ]);
  const fullOrder =
    await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
      where: { id: order.id },
      ...EcommerceMallOrderTransformer.select(),
    });
  return await EcommerceMallOrderTransformer.transform(fullOrder);
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
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersCheckout(props: {
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