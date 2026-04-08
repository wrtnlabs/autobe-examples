import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
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

export async function postShoppingMallCustomerCheckout(props: {
  customer: CustomerPayload;
  body: IShoppingMallCheckout.ICreate;
}): Promise<IShoppingMallOrder> {
  const now = new Date();
  const orderNumber = `ORD-${now.getTime()}-${v4().slice(0, 8).toUpperCase()}`;
  // Get customer's cart with cart items and product variant details
  const cart = await MyGlobal.prisma.shopping_mall_customer_carts.findUnique({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
    select: {
      id: true,
      cartItems: {
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
          quantity: true,
          productVariant: {
            select: {
              id: true,
              sku_code: true,
              price: true,
              deleted_at: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  base_price: true,
                  shopping_mall_category_id: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  seller: {
                    select: {
                      id: true,
                      sellerProfile: {
                        select: {
                          shop_name: true,
                          shop_description: true,
                          logo_uri: true,
                        },
                      },
                    },
                  },
                  images: {
                    select: {
                      image_uri: true,
                      display_order: true,
                    },
                    orderBy: {
                      display_order: "asc",
                    },
                  },
                },
              },
              variantOptions: {
                select: {
                  key: true,
                  value: true,
                },
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.shopping_mall_customer_cartsFindUniqueArgs);
  if (!cart || cart.cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Validate shipping address
  const shippingAddress =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findUnique({
      where: {
        id: props.body.shopping_mall_customer_address_id,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (!shippingAddress) {
    throw new HttpException("Invalid shipping address", 400);
  }
  // Check inventory availability and verify variants are not deleted
  const inventoryRecords =
    await MyGlobal.prisma.shopping_mall_inventory_records.groupBy({
      by: ["shopping_mall_product_variant_id"],
      where: {
        shopping_mall_product_variant_id: {
          in: cart.cartItems.map(
            (item: { shopping_mall_product_variant_id: string }) =>
              item.shopping_mall_product_variant_id,
          ),
        },
        deleted_at: null,
      },
      _sum: {
        quantity_change: true,
      },
    });
  const inventoryMap = new Map(
    inventoryRecords.map((record) => [
      record.shopping_mall_product_variant_id,
      record._sum.quantity_change ?? 0,
    ]),
  );
  for (const cartItem of cart.cartItems) {
    const variant = cartItem.productVariant;
    // Verify variant is not soft-deleted
    if (variant.deleted_at !== null) {
      throw new HttpException(
        `Product variant ${variant.sku_code} is no longer available`,
        400,
      );
    }
    const availableStock =
      inventoryMap.get(cartItem.shopping_mall_product_variant_id) ?? 0;
    if (availableStock < cartItem.quantity) {
      throw new HttpException(
        `Insufficient stock for variant ${variant.sku_code}. Available: ${availableStock}, Requested: ${cartItem.quantity}`,
        400,
      );
    }
  }
  // Create order and order items in a transaction
  const orderId = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create order
    const createdOrder = await tx.shopping_mall_orders.create({
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
    });
    // Create order items and snapshots
    for (const cartItem of cart.cartItems) {
      const variant = cartItem.productVariant;
      const product = variant.product;
      const seller = product.seller;
      const category = product.category;
      const itemPrice = variant.price ?? product.base_price;
      // Ensure seller profile exists
      if (!seller.sellerProfile) {
        throw new HttpException(
          `Seller ${seller.id} does not have a profile`,
          500,
        );
      }
      // Create order item
      const orderItem = await tx.shopping_mall_order_items.create({
        data: {
          id: v4(),
          shopping_mall_order_id: createdOrder.id,
          shopping_mall_product_variant_id:
            cartItem.shopping_mall_product_variant_id,
          shopping_mall_seller_id: seller.id,
          quantity: cartItem.quantity,
          price: itemPrice,
          status: "paid",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // Create snapshot
      const snapshotId = v4();
      await tx.shopping_mall_order_item_snapshots.create({
        data: {
          id: snapshotId,
          shopping_mall_order_item_id: orderItem.id,
          product_name: product.name,
          product_description: product.description,
          product_category_id: product.shopping_mall_category_id ?? v4(),
          product_category_name: category?.name ?? "Uncategorized",
          product_base_price: product.base_price,
          variant_sku_code: variant.sku_code,
          variant_price: itemPrice,
          seller_shop_name: seller.sellerProfile.shop_name,
          seller_shop_description: seller.sellerProfile.shop_description,
          seller_shop_logo_uri: seller.sellerProfile.logo_uri ?? "",
          created_at: now,
        },
      });
      // Add product images to snapshot
      let displayOrder = 1;
      for (const image of product.images) {
        await tx.shopping_mall_order_item_snapshot_product_images.create({
          data: {
            id: v4(),
            shopping_mall_order_item_snapshot_id: snapshotId,
            image_uri: image.image_uri,
            display_order: displayOrder++,
            created_at: now,
          },
        });
      }
      // Add variant options to snapshot
      for (const option of variant.variantOptions) {
        await tx.shopping_mall_order_item_snapshot_variant_options.create({
          data: {
            id: v4(),
            shopping_mall_order_item_snapshot_id: snapshotId,
            key: option.key,
            value: option.value,
            created_at: now,
          },
        });
      }
      // Deduct inventory
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            cartItem.shopping_mall_product_variant_id,
          quantity_change: -cartItem.quantity,
          reason: `Order ${orderNumber}`,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    // Clear cart items
    await tx.shopping_mall_customer_cart_items.updateMany({
      where: {
        shopping_mall_customer_cart_id: cart.id,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
      },
    });
    return createdOrder.id;
  });
  // Fetch the created order with all relations
  const record = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: orderId,
    },
    ...ShoppingMallOrderTransformer.select(),
  });
  return await ShoppingMallOrderTransformer.transform(record);
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
// import { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
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
// export async function postShoppingMallCustomerCheckout(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCheckout.ICreate;
// }): Promise<IShoppingMallOrder> {
//   const record = await MyGlobal.prisma.shopping_mall_orders.findFirstOrThrow({
//     ...ShoppingMallOrderTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------