import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerShipments(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get order IDs for this customer
  const customerOrders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const orderIds = customerOrders.map((o: { id: string }) => o.id);
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
    ecommerce_mall_order_id: { in: orderIds },
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.carrier_name && {
      carrier_name: { contains: props.body.carrier_name.toLowerCase() },
    }),
    ...(props.body.created_at && {
      created_at: { gte: new Date(props.body.created_at) },
    }),
    ...(props.body.shipped_at && {
      shipped_at: { gte: new Date(props.body.shipped_at) },
    }),
    ...(props.body.delivered_at && {
      delivered_at: { gte: new Date(props.body.delivered_at) },
    }),
    ...(props.body.estimated_delivery_at && {
      estimated_delivery_at: {
        gte: new Date(props.body.estimated_delivery_at),
      },
    }),
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  // Build order by
  const orderByInput = props.body.sort
    ? { [props.body.sort]: "desc" as const }
    : { created_at: "desc" as const };
  // Query shipments
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_shipments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        carrier_name: true,
        carrier_phone: true,
        carrier_website: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        estimated_delivery_at: true,
        ecommerce_mall_order_id: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_shipments.count({ where: whereInput }),
  ]);
  // Get order details in batch
  const ordersMap = new Map<string, IEcommerceMallOrder.ISummary>();
  if (orderIds.length > 0) {
    const orders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
      where: {
        id: { in: orderIds },
        deleted_at: null,
      },
      select: {
        id: true,
        order_number: true,
        total_price: true,
        status: true,
        shipping_address_id: true,
        created_at: true,
        deleted_at: true,
        shippingAddress: {
          select: {
            id: true,
            recipient_name: true,
            recipient_phone: true,
            street: true,
            city: true,
            state: true,
            is_default: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
    for (const order of orders) {
      ordersMap.set(order.id, {
        id: order.id as string & tags.Format<"uuid">,
        order_number: order.order_number,
        total_price: order.total_price,
        status: order.status,
        shipping_address: {
          id: order.shippingAddress.id as string & tags.Format<"uuid">,
          recipient_name: order.shippingAddress.recipient_name,
          recipient_phone: order.shippingAddress.recipient_phone,
          street: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          is_default: order.shippingAddress.is_default,
          created_at: toISOStringSafe(order.shippingAddress.created_at),
          updated_at: toISOStringSafe(order.shippingAddress.updated_at),
          deleted_at: order.shippingAddress.deleted_at
            ? toISOStringSafe(order.shippingAddress.deleted_at)
            : null,
        } satisfies IEcommerceMallAddress.ISummary,
        created_at: toISOStringSafe(order.created_at),
        deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
      } satisfies IEcommerceMallOrder.ISummary);
    }
  }
  // Transform to summary
  const summaryData = await ArrayUtil.asyncMap(data, async (shipment) => {
    const trackingCount =
      await MyGlobal.prisma.ecommerce_mall_shipment_tracking_codes.count({
        where: { shipment_id: shipment.id },
      });
    const order = ordersMap.get(shipment.ecommerce_mall_order_id);
    return {
      id: shipment.id as string & tags.Format<"uuid">,
      carrierName: shipment.carrier_name ?? undefined,
      carrierPhone: shipment.carrier_phone ?? undefined,
      carrierWebsite: shipment.carrier_website ?? undefined,
      status: shipment.status,
      shippedAt: shipment.shipped_at
        ? toISOStringSafe(shipment.shipped_at)
        : undefined,
      deliveredAt: shipment.delivered_at
        ? toISOStringSafe(shipment.delivered_at)
        : undefined,
      estimatedDeliveryAt: shipment.estimated_delivery_at
        ? toISOStringSafe(shipment.estimated_delivery_at)
        : undefined,
      order: order!,
      trackingCount: trackingCount,
    } satisfies IEcommerceMallShipment.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: summaryData,
  } satisfies IPageIEcommerceMallShipment.ISummary;
}
