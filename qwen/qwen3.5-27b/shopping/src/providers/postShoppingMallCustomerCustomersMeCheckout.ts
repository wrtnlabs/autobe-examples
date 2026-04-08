import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCustomersMeCheckout(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // Validate shipping address exists, belongs to customer, and is not deleted
  await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
    where: {
      id: props.body.shopping_mall_customer_address_id,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Retrieve customer's shopping cart with items
  const cart = await MyGlobal.prisma.shopping_mall_customer_carts.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
    include: {
      cartItems: {
        where: { deleted_at: null },
        include: {
          productVariant: {
            include: {
              product: {
                select: {
                  base_price: true,
                  deleted_at: true,
                  shopping_mall_seller_id: true,
                },
              },
              inventoryRecords: {
                where: { deleted_at: null },
                select: { quantity_change: true },
              },
            },
          },
        },
      },
    },
  });
  if (cart === null || cart.cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Validate each cart item and prepare data
  const orderItemsData: Array<{
    id: string;
    shopping_mall_product_variant_id: string;
    shopping_mall_seller_id: string;
    quantity: number;
    price: number;
    status: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: null;
  }> = [];
  const inventoryDeductions: Array<{
    id: string;
    shopping_mall_product_variant_id: string;
    quantity_change: number;
    reason: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: null;
  }> = [];
  const now = new Date();
  for (const cartItem of cart.cartItems) {
    // Validate variant exists and is not deleted
    if (cartItem.productVariant.deleted_at !== null) {
      throw new HttpException(
        `Product variant ${cartItem.productVariant.sku_code} is no longer available`,
        400,
      );
    }
    // Validate product is not deleted
    if (cartItem.productVariant.product.deleted_at !== null) {
      throw new HttpException(`Product is no longer available`, 400);
    }
    // Calculate current stock from inventory records
    const currentStock = cartItem.productVariant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    // Check inventory availability
    if (currentStock < cartItem.quantity) {
      throw new HttpException(
        `Insufficient stock for variant ${cartItem.productVariant.sku_code}. Available: ${currentStock}, Requested: ${cartItem.quantity}`,
        400,
      );
    }
    // Calculate price (variant price if set, otherwise product base price)
    const price =
      cartItem.productVariant.price ??
      cartItem.productVariant.product.base_price;
    // Prepare order item data
    orderItemsData.push({
      id: v4(),
      shopping_mall_product_variant_id: cartItem.productVariant.id,
      shopping_mall_seller_id:
        cartItem.productVariant.product.shopping_mall_seller_id,
      quantity: cartItem.quantity,
      price: price,
      status: "paid",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    // Prepare inventory deduction (will be updated with order number after creation)
    inventoryDeductions.push({
      id: v4(),
      shopping_mall_product_variant_id: cartItem.productVariant.id,
      quantity_change: -cartItem.quantity,
      reason: `Order placement`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }
  // Generate unique order number
  const orderNumber = `ORD-${Date.now()}-${v4().slice(0, 8)}`;
  // Execute database transaction for atomicity
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create order record
    const order = await tx.shopping_mall_orders.create({
      data: {
        id: v4(),
        order_number: orderNumber,
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_customer_address_id:
          props.body.shopping_mall_customer_address_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        order_number: true,
      },
    });
    // Update inventory deduction reasons with order number
    const inventoryRecordsWithOrder = inventoryDeductions.map((deduction) => ({
      ...deduction,
      reason: `Order #${order.order_number}`,
    }));
    // Create order items
    await tx.shopping_mall_order_items.createMany({
      data: orderItemsData.map((item) => ({
        ...item,
        shopping_mall_order_id: order.id,
      })),
    });
    // Deduct inventory
    await tx.shopping_mall_inventory_records.createMany({
      data: inventoryRecordsWithOrder,
    });
    // Soft delete all cart items to clear the cart
    await tx.shopping_mall_customer_cart_items.updateMany({
      where: {
        shopping_mall_customer_cart_id: cart.id,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
      },
    });
    return order;
  });
  // Fetch the created order with all details using transformer
  const createdOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: result.id },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(createdOrder);
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
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
// import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
// import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerCustomersMeCheckout(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallOrder.ICreate;
// }): Promise<IShoppingMallOrder> {
//   const record = await MyGlobal.prisma.shopping_mall_orders.create({
//     data: await ShoppingMallOrderCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallOrderTransformer.select(),
//   });
//   return await ShoppingMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------