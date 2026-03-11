import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdShipmentsShipmentIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentItem.IRequest;
}): Promise<IPageIEcommerceMallShipmentItem.ISummary> {
  // Validate order exists and is owned by customer
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Validate shipment exists and belongs to the order
  await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId, order_id: props.orderId, deleted_at: null },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build filter conditions
  const whereInput = {
    shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.itemStatus && {
      orderItem: {
        item_status: props.body.itemStatus,
      },
    }),
    ...(props.body.search && {
      order: {
        order_number: {
          contains: props.body.search,
        },
      },
    }),
  } satisfies Prisma.ecommerce_mall_shipment_itemsWhereInput;
  // Parse sort parameter
  const orderByInput =
    ((): Prisma.ecommerce_mall_shipment_itemsOrderByWithRelationInput[] => {
      if (props.body.sort === "quantity") {
        return [
          {
            orderItem: {
              quantity: "asc",
            },
          },
        ];
      }
      if (props.body.sort === "itemStatus") {
        return [
          {
            orderItem: {
              item_status: "asc",
            },
          },
        ];
      }
      // Default sort by created_at ASC
      return [{ created_at: "asc" }];
    })() satisfies Prisma.ecommerce_mall_shipment_itemsOrderByWithRelationInput[];
  // Query shipment items with nested relations
  const data = await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    include: {
      shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
      orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_shipment_items.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    async (item) =>
      ({
        id: item.id,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
        deleted_at: item.deleted_at?.toISOString() ?? null,
        shipment: await EcommerceMallShipmentAtSummaryTransformer.transform(
          item.shipment,
        ),
        orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
          item.orderItem,
        ),
      }) satisfies IEcommerceMallShipmentItem.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
