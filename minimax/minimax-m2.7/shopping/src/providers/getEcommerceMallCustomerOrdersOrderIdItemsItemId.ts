import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItem> {
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: props.orderId },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
    },
  });
  if (order === null) {
    throw new HttpException("Not found", 404);
  }
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      ecommerce_mall_order_id: props.orderId,
    },
    select: {
      id: true,
      quantity: true,
      unit_price: true,
      status: true,
      created_at: true,
      updated_at: true,
      product: {
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
          id: true,
        },
      },
      shipmentItem: {
        select: {
          id: true,
        },
      },
      cancellationRequests: {
        select: {
          id: true,
        },
      },
      refundRequests: {
        select: {
          id: true,
        },
      },
      productSnapshot:
        EcommerceMallProductSnapshotAtSummaryTransformer.select(),
      sellerProfileSnapshot:
        EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
      productVariant: EcommerceMallProductVariantAtSummaryTransformer.select(),
    },
  });
  if (orderItem === null) {
    throw new HttpException("Not found", 404);
  }
  return await EcommerceMallOrderItemTransformer.transform(orderItem);
}
