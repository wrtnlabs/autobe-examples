import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Check order exists and belongs to seller
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  // Check shipments exist for the order
  const data = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: {
      ecommerce_mall_order_id: props.orderId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    skip,
    take: limit + 1,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      tracking_number: true,
      carrier_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller: {
        select: {
          id: true,
          shop_name: true,
          approval_status: true,
          is_suspended: true,
          created_at: true,
        },
      },
    },
  });
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  // Transform shipments with shipment items count
  const transformedData = await ArrayUtil.asyncMap(items, async (shipment) => {
    const shipmentItemsCount =
      await MyGlobal.prisma.ecommerce_mall_shipment_items.count({
        where: { shipment_id: shipment.id },
      });
    return {
      id: shipment.id as string & tags.Format<"uuid">,
      tracking_number: shipment.tracking_number,
      carrier_name: shipment.carrier_name,
      shipment_status: "pending", // TODO: Implement status calculation
      created_at: toISOStringSafe(shipment.created_at),
      updated_at: shipment.updated_at
        ? toISOStringSafe(shipment.updated_at)
        : undefined,
      deleted_at: shipment.deleted_at
        ? toISOStringSafe(shipment.deleted_at)
        : undefined,
      seller: {
        id: shipment.seller.id as string & tags.Format<"uuid">,
        shop_name: shipment.seller.shop_name,
        approval_status: shipment.seller.approval_status,
        is_suspended: shipment.seller.is_suspended,
        created_at: toISOStringSafe(shipment.seller.created_at),
      },
    } satisfies IEcommerceMallShipment.ISummary;
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: {
      ecommerce_mall_order_id: props.orderId,
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallShipment.ISummary;
}
