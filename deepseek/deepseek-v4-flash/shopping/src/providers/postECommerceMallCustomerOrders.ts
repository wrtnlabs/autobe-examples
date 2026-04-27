import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallOrderTransformer } from "../transformers/ECommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IECommerceMallOrder.ICreate;
}): Promise<IECommerceMallOrder> {
  // 1. Fetch active cart items with variant, product, seller profile, and options
  const cartItems = await MyGlobal.prisma.e_commerce_mall_cart_items.findMany({
    where: {
      e_commerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      productVariant: {
        include: {
          product: {
            include: {
              seller: {
                include: {
                  profile: true,
                },
              },
            },
          },
          options: {
            where: { deleted_at: null },
          },
        },
      },
    },
  });
  // 2. Validate: cart must not be empty
  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 422);
  }
  // 3. Fetch and validate shipping address belongs to customer and is not deleted
  const address =
    await MyGlobal.prisma.e_commerce_mall_customer_addresses.findFirstOrThrow({
      where: {
        id: props.body.addressId,
        e_commerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // 4. Validate each cart item, build order item create data, calculate total price
  const now = new Date().toISOString();
  let totalPrice = 0;
  const orderItemsCreateData: Array<{
    id: string & tags.Format<"uuid">;
    quantity: number;
    unit_price: number;
    status: string;
    created_at: string;
    updated_at: string;
    deleted_at: null;
    productVariant: {
      connect: {
        id: string & tags.Format<"uuid">;
      };
    };
    productVariantSnapshot: {
      create: {
        id: string & tags.Format<"uuid">;
        product_name: string;
        product_description: string;
        product_base_price: number;
        variant_sku: string;
        variant_options: string;
        variant_price: number | null;
        created_at: string;
      };
    };
    sellerSnapshot: {
      create: {
        id: string & tags.Format<"uuid">;
        shop_name: string;
        shop_logo: string | null;
        created_at: string;
      };
    };
    statusLogs: {
      create: {
        id: string & tags.Format<"uuid">;
        from_status: null;
        to_status: string;
        reason: null;
        created_at: string;
        updated_at: string;
      };
    };
  }> = [];
  for (const item of cartItems) {
    const variant = item.productVariant;
    const product = variant.product;
    // Validate variant is not deleted
    if (variant.deleted_at !== null) {
      throw new HttpException(
        `Variant ${variant.sku_code} is no longer available`,
        422,
      );
    }
    // Validate sufficient stock via inventory_records aggregation
    const stockAgg =
      await MyGlobal.prisma.e_commerce_mall_inventory_records.aggregate({
        where: {
          e_commerce_mall_product_variant_id: variant.id,
        },
        _sum: { quantity_change: true },
      });
    const availableStock = stockAgg._sum.quantity_change ?? 0;
    if (availableStock < item.quantity) {
      throw new HttpException(
        `Insufficient stock for variant ${variant.sku_code}: requested ${item.quantity}, available ${availableStock}`,
        422,
      );
    }
    // Resolve unit price: use variant price override, or fall back to product base_price
    const unitPrice = variant.price ?? product.base_price;
    totalPrice += unitPrice * item.quantity;
    // Format variant options as key-value string
    const variantOptionsStr = variant.options
      .map((o) => `${o.key}: ${o.value}`)
      .join(", ");
    const sellerProfile = product.seller.profile;
    orderItemsCreateData.push({
      id: v4() as string & tags.Format<"uuid">,
      quantity: item.quantity,
      unit_price: unitPrice,
      status: "paid",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      productVariant: {
        connect: {
          id: variant.id as string & tags.Format<"uuid">,
        },
      },
      productVariantSnapshot: {
        create: {
          id: v4() as string & tags.Format<"uuid">,
          product_name: product.name,
          product_description: product.description,
          product_base_price: product.base_price,
          variant_sku: variant.sku_code,
          variant_options: variantOptionsStr,
          variant_price: variant.price,
          created_at: now,
        },
      },
      sellerSnapshot: {
        create: {
          id: v4() as string & tags.Format<"uuid">,
          shop_name: sellerProfile?.shop_name ?? "",
          shop_logo: sellerProfile?.logo_image ?? null,
          created_at: now,
        },
      },
      statusLogs: {
        create: {
          id: v4() as string & tags.Format<"uuid">,
          from_status: null,
          to_status: "paid",
          reason: null,
          created_at: now,
          updated_at: now,
        },
      },
    });
  }
  // 5. Generate unique order code
  const orderId = v4() as string & tags.Format<"uuid">;
  const code = `ORD-${Date.now()}-${v4().slice(0, 8)}`;
  // 6. Create the order with all nested creates in a transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdOrder = await tx.e_commerce_mall_orders.create({
      data: {
        id: orderId,
        code,
        total_price: totalPrice,
        shipping_recipient_name: address.recipient_name,
        shipping_phone: address.phone_number,
        shipping_street_address: address.street_address,
        shipping_city: address.city,
        shipping_state_province: address.state_province,
        shipping_postal_code: address.postal_code,
        shipping_country: address.country,
        created_at: now,
        updated_at: now,
        customer: {
          connect: {
            id: props.customer.id as string & tags.Format<"uuid">,
          },
        },
        orderItems: {
          create: orderItemsCreateData,
        },
      },
      ...ECommerceMallOrderTransformer.select(),
    });
    // 7. Create negative inventory records for stock deduction
    await tx.e_commerce_mall_inventory_records.createMany({
      data: cartItems.map((item) => ({
        id: v4() as string & tags.Format<"uuid">,
        e_commerce_mall_product_variant_id: item.productVariant.id as string &
          tags.Format<"uuid">,
        quantity_change: -item.quantity,
        reason: `order placed - Order #${code}`,
        created_at: now,
      })),
    });
    // 8. Soft-delete all cart items
    await tx.e_commerce_mall_cart_items.updateMany({
      where: {
        e_commerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      data: { deleted_at: now },
    });
    return createdOrder;
  });
  // 9. Transform and return
  return await ECommerceMallOrderTransformer.transform(result);
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
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
// import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
// import { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
// import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
// import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
// import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
// import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
// import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
// import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallCustomerOrders(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallOrder.ICreate;
// }): Promise<IECommerceMallOrder> {
//   const record = await MyGlobal.prisma.e_commerce_mall_orders.create({
//     data: await ECommerceMallOrderCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallOrderTransformer.select(),
//   });
//   return await ECommerceMallOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------