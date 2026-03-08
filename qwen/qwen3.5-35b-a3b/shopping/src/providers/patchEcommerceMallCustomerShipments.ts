import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerShipments(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const pageStr = props.body.page ?? "1";
  const limitRaw = props.body.limit ?? 20;
  const limit = Math.max(10, Math.min(Number(limitRaw), 100));
  const page = parseInt(pageStr, 10) || 1;
  const skip = (page - 1) * limit;
  // Get customer's order IDs
  const customerOrders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: {
      customer: { id: props.customer.id },
      deleted_at: null,
      ...(props.body.orderId && { id: props.body.orderId }),
    },
    select: { id: true },
  });
  const orderIds = customerOrders.map((o) => o.id);
  if (orderIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Get order item IDs that belong to customer's orders
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      order: { id: { in: orderIds } },
    },
    select: { id: true },
  });
  const orderItemIds = orderItems.map((oi) => oi.id);
  if (orderItemIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Get shipment IDs from shipment_items for these order items
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: {
        orderItem: { id: { in: orderItemIds } },
      },
      select: { shipment: { select: { id: true } } },
    });
  const shipmentIds = [...new Set(shipmentItems.map((si) => si.shipment.id))];
  if (shipmentIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Build WHERE clause for shipments
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    id: { in: shipmentIds },
    deleted_at: null,
  };
  // Add optional filters
  if (props.body.trackingNumber) {
    whereInput.tracking_number = { contains: props.body.trackingNumber };
  }
  if (props.body.createdAfter) {
    whereInput.created_at = { gte: props.body.createdAfter };
  }
  if (props.body.createdBefore) {
    whereInput.created_at = { lte: props.body.createdBefore };
  }
  // Build ORDER BY
  const sortOrder: Prisma.SortOrder =
    props.body.sortOrder === "asc" ? "asc" : "desc";
  const orderByInput =
    props.body.sortBy === "sellerId"
      ? { seller: { id: sortOrder } }
      : props.body.sortBy === "trackingNumber"
        ? { tracking_number: sortOrder }
        : { created_at: sortOrder };
  // Query shipments with proper select pattern
  const data = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
