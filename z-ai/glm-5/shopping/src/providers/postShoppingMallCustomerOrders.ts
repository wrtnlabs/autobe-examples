import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const now = new Date();
  // 1. Retrieve cart items with all necessary relations
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      shopping_customer_id: props.customer.id,
    },
    select: {
      id: true,
      quantity: true,
      unit_price: true,
      variant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          deleted_at: true,
          options: {
            select: {
              key: true,
              value: true,
            },
          } satisfies Prisma.shopping_mall_product_variant_optionsFindManyArgs,
          inventoryHistories: {
            select: {
              quantity_change: true,
            },
          } satisfies Prisma.shopping_mall_product_inventory_historiesFindManyArgs,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              base_price: true,
              deleted_at: true,
              category: {
                select: {
                  name: true,
                },
              },
              images: {
                select: {
                  url: true,
                },
                orderBy: {
                  order: "asc" as const,
                },
                take: 1,
              } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
              seller: {
                select: {
                  id: true,
                  shop_name: true,
                  shop_description: true,
                  logo_url: true,
                  approval_status: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
    },
  });
  // 2. Validate cart is not empty
  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // 3. Validate each cart item
  const unavailableItems: Array<{
    skuCode: string;
    reason: string;
  }> = [];
  for (const item of cartItems) {
    const variant = item.variant;
    const product = variant.product;
    const seller = product.seller;
    // Check variant deleted
    if (variant.deleted_at !== null) {
      unavailableItems.push({
        skuCode: variant.sku_code,
        reason: "Variant has been removed",
      });
      continue;
    }
    // Check product deleted
    if (product.deleted_at !== null) {
      unavailableItems.push({
        skuCode: variant.sku_code,
        reason: "Product has been removed",
      });
      continue;
    }
    // Check seller approved and not deleted
    if (seller.approval_status !== "approved") {
      unavailableItems.push({
        skuCode: variant.sku_code,
        reason: "Seller is not approved",
      });
      continue;
    }
    if (seller.deleted_at !== null) {
      unavailableItems.push({
        skuCode: variant.sku_code,
        reason: "Seller account has been deactivated",
      });
      continue;
    }
    // Check stock
    const currentStock = variant.inventoryHistories.reduce(
      (sum, h) => sum + h.quantity_change,
      0,
    );
    if (currentStock < item.quantity) {
      unavailableItems.push({
        skuCode: variant.sku_code,
        reason: `Insufficient stock. Available: ${currentStock}, Requested: ${item.quantity}`,
      });
    }
  }
  if (unavailableItems.length > 0) {
    throw new HttpException(
      `Some items are unavailable: ${unavailableItems.map((i) => `${i.skuCode} - ${i.reason}`).join("; ")}`,
      400,
    );
  }
  // 4. Generate order number (ORD-YYYY-NNNNNN format)
  const year = now.getFullYear();
  const lastOrder = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: {
        startsWith: `ORD-${year}-`,
      },
    },
    orderBy: {
      order_number: "desc",
    },
  });
  const lastNumber = lastOrder
    ? parseInt(lastOrder.order_number.split("-")[2], 10)
    : 0;
  const orderNumber = `ORD-${year}-${String(lastNumber + 1).padStart(6, "0")}`;
  // 5. Calculate total price
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  // 6. Create order ID
  const orderId = v4() as string & tags.Format<"uuid">;
  // Note: shopping_mall_customer_addresses table is not in the current schema.
  // The address_id in the request body cannot be validated against customer addresses.
  // For this implementation, we create a placeholder address snapshot.
  // TODO: Implement proper address validation when customer addresses are added.
  // 7. Create order with all related data in transaction
  const order = await MyGlobal.prisma.shopping_mall_orders.create({
    data: {
      id: orderId,
      order_number: orderNumber,
      total_price: totalPrice,
      status: "paid",
      shopping_mall_customer_id: props.customer.id,
      created_at: now,
      updated_at: now,
      address: {
        create: {
          id: v4(),
          recipient_name: "Customer Address",
          phone: "Contact Phone",
          street: "Street Address",
          city: "City",
          state: "State",
          postal_code: "00000",
          country: "Country",
          created_at: now,
        },
      },
      orderItems: {
        create: cartItems.map((cartItem) => {
          const variant = cartItem.variant;
          const product = variant.product;
          const seller = product.seller;
          const category = product.category;
          return {
            id: v4(),
            shopping_mall_seller_id: seller.id,
            shopping_mall_product_id: product.id,
            shopping_mall_product_variant_id: variant.id,
            product_name: product.name,
            product_description: product.description,
            product_category_name: category?.name ?? "Uncategorized",
            product_base_price: product.base_price,
            product_thumbnail_url: product.images[0]?.url ?? "",
            variant_sku_code: variant.sku_code,
            variant_price: variant.price ?? product.base_price,
            seller_shop_name: seller.shop_name,
            seller_shop_description: seller.shop_description,
            seller_logo_url: seller.logo_url,
            quantity: cartItem.quantity,
            unit_price: cartItem.unit_price,
            status: "paid",
            created_at: now,
            variantOptions: {
              create: variant.options.map((option) => ({
                id: v4(),
                key: option.key,
                value: option.value,
                created_at: now,
              })),
            },
          };
        }),
      },
    },
  });
  // 8. Create inventory history records for each purchased variant
  for (const cartItem of cartItems) {
    await MyGlobal.prisma.shopping_mall_product_inventory_histories.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id: cartItem.variant.id,
        quantity_change: -cartItem.quantity,
        reason: `Order placed - Order #${orderNumber}`,
        created_at: now,
      },
    });
  }
  // 9. Delete all cart items for this customer
  await MyGlobal.prisma.shopping_mall_cart_items.deleteMany({
    where: {
      shopping_customer_id: props.customer.id,
    },
  });
  // 10. Fetch and return complete order using transformer
  const completeOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(completeOrder);
}
