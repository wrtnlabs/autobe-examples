import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipmentsShipmentIdOrderItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // First, validate that the shipment exists and belongs to the seller
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (
    !shipment ||
    shipment.deleted_at !== null ||
    shipment.seller_id !== props.seller.id
  ) {
    throw new HttpException("Shipment not found or access denied", 404);
  }
  // Pagination parameters (hardcoded as page and limit do not exist on body)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Find shipment order items IDs linked to shipment
  const shipmentOrderItems =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findMany({
      where: { shopping_mall_shipment_id: props.shipmentId, deleted_at: null },
      select: { shopping_mall_order_item_id: true },
    });
  const orderItemIds = shipmentOrderItems.map(
    (x) => x.shopping_mall_order_item_id,
  );
  if (orderItemIds.length === 0) {
    return {
      data: [],
      pagination: { current: page, limit: limit, records: 0, pages: 0 },
    };
  }
  // Build where filter for order items
  const whereInput: Prisma.shopping_mall_order_itemsWhereInput = {
    id: { in: orderItemIds },
    deleted_at: null,
  };
  // Fetch order items with pagination
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Count total items
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
  // Format fields for output (stringify dates to ISO strings with date-time tags)
  const formattedData: IShoppingMallOrderItem.ISummary[] = data.map((item) => ({
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    quantity: item.quantity,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
    updated_at: item.updated_at
      ? (toISOStringSafe(item.updated_at) as string & tags.Format<"date-time">)
      : null,
    deleted_at: item.deleted_at
      ? (toISOStringSafe(item.deleted_at) as string & tags.Format<"date-time">)
      : null,
  }));
  return {
    data: formattedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
