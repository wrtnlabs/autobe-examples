import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { ShoppingMallShippingAddressAtSummaryTransformer } from "../transformers/ShoppingMallShippingAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      order_number: true,
      status: true,
      subtotal_amount: true,
      shipping_fee_amount: true,
      discount_amount: true,
      total_amount: true,
      placed_at: true,
      paid_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      shippingAddress: ShoppingMallShippingAddressAtSummaryTransformer.select(),
      orderItems: {
        select: {
          id: true,
          shopping_mall_order_id: true,
          shopping_mall_product_variant_id: true,
          quantity: true,
          status: true,
          shipped_at: true,
          delivered_at: true,
          cancelled_at: true,
          refunded_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          snapshots: {
            select: {
              id: true,
            },
          },
          reviews: {
            select: {
              id: true,
            },
          },
          order: {
            select: {
              customer: ShoppingMallCustomerAtSummaryTransformer.select(),
              id: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              status: true,
              order_number: true,
              subtotal_amount: true,
              shipping_fee_amount: true,
              discount_amount: true,
              total_amount: true,
              placed_at: true,
              paid_at: true,
              shippingAddress:
                ShoppingMallShippingAddressAtSummaryTransformer.select(),
            },
          },
          cancellationRequest: {
            select: {
              id: true,
            },
          },
          refundRequests: {
            select: {
              id: true,
            },
          },
          productVariant: {
            select: {
              id: true,
              sku_code: true,
              override_price: true,
              stock_quantity: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      shipments: {
        select: {
          id: true,
          carrier_name: true,
          tracking_number: true,
          status: true,
          shipped_at: true,
          delivered_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          order: {
            select: {
              customer: ShoppingMallCustomerAtSummaryTransformer.select(),
              id: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              status: true,
              order_number: true,
              subtotal_amount: true,
              shipping_fee_amount: true,
              discount_amount: true,
              total_amount: true,
              placed_at: true,
              paid_at: true,
              shippingAddress:
                ShoppingMallShippingAddressAtSummaryTransformer.select(),
            },
          },
          seller: ShoppingMallSellerAtSummaryTransformer.select(),
        },
      },
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallOrderTransformer.transform(order);
}
