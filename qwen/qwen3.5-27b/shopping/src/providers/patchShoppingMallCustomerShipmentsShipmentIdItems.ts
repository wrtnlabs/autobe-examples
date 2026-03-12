import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentItemAtSummaryTransformer } from "../transformers/ShoppingMallShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerShipmentsShipmentIdItems(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem.ISummary> {
  // Verify shipment exists
  await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Get shipment item IDs for authorization check
  const shipmentItems =
    await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
      },
      select: {
        shopping_mall_order_item_id: true,
      },
    });
  const orderItemIds = shipmentItems.map(
    (item) => item.shopping_mall_order_item_id,
  );
  // Get order IDs from order items for authorization
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: {
        in: orderItemIds,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
    },
  });
  const orderIds = [
    ...new Set(orderItems.map((item) => item.shopping_mall_order_id)),
  ];
  // Verify customer owns all orders
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      id: {
        in: orderIds,
      },
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (orders.length !== orderIds.length) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    shopping_mall_shipment_id: props.shipmentId,
    orderItem: {
      deleted_at: null,
      ...(props.body.status && { status: props.body.status }),
    },
  } satisfies Prisma.shopping_mall_shipment_itemsWhereInput;
  // Query data
  const data = await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc" as const,
    },
    ...ShoppingMallShipmentItemAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.shopping_mall_shipment_items.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallShipmentItemAtSummaryTransformer.transform,
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
