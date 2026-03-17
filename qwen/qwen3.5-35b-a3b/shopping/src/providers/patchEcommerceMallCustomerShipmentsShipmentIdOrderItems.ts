import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentsOrderItem";
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

export async function patchEcommerceMallCustomerShipmentsShipmentIdOrderItems(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentsOrderItem.IRequest;
}): Promise<IPageIEcommerceMallShipmentsOrderItem.ISummary> {
  // Validate shipment exists and customer has access to parent order
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Verify customer owns the order containing this shipment
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirst({
    where: {
      id: shipment.ecommerce_mall_order_id,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build search filter if provided
  const whereInput: Prisma.ecommerce_mall_shipments_order_itemsWhereInput = {
    ecommerce_mall_shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.search
      ? {
          OR: [
            { orderItem: { product_name: { contains: props.body.search } } },
            { orderItem: { product_sku: { contains: props.body.search } } },
            { orderItem: { variant_name: { contains: props.body.search } } },
          ],
        }
      : {}),
    ...(props.body.shippedQuantity !== undefined
      ? { shipped_quantity: props.body.shippedQuantity }
      : {}),
  } satisfies Prisma.ecommerce_mall_shipments_order_itemsWhereInput;
  // Build order by
  const orderByInput = (
    props.body.sortBy === "shipped_quantity"
      ? { shipped_quantity: props.body.sortOrder === "desc" ? "desc" : "asc" }
      : { created_at: props.body.sortOrder === "desc" ? "desc" : "asc" }
  ) satisfies Prisma.ecommerce_mall_shipments_order_itemsOrderByWithRelationInput;
  // Query order items with relations
  const data =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        shipped_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipment: EcommerceMallShipmentAtSummaryTransformer.select(),
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_shipments_order_itemsFindManyArgs);
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => {
    const shipmentSummary =
      await EcommerceMallShipmentAtSummaryTransformer.transform(item.shipment);
    const orderItemSummary =
      await EcommerceMallOrderItemAtSummaryTransformer.transform(
        item.orderItem,
      );
    return {
      id: item.id,
      shipped_quantity: item.shipped_quantity,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
      shipment: shipmentSummary,
      orderItem: orderItemSummary,
    } satisfies IEcommerceMallShipmentsOrderItem.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
