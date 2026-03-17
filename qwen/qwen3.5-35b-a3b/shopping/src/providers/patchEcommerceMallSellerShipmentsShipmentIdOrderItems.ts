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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipmentsShipmentIdOrderItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentsOrderItem.IRequest;
}): Promise<IPageIEcommerceMallShipmentsOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
    where: {
      id: props.shipmentId,
      deleted_at: null,
      ecommerce_mall_seller_id: props.seller.id,
    },
  });
  const whereInput: Prisma.ecommerce_mall_shipments_order_itemsWhereInput = {
    ecommerce_mall_shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.shippedQuantity !== undefined && {
      shipped_quantity: props.body.shippedQuantity,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        orderItem: {
          product_name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      }),
  } satisfies Prisma.ecommerce_mall_shipments_order_itemsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_shipments_order_itemsOrderByWithRelationInput[] =
    props.body.sortBy === "shipped_quantity"
      ? [{ shipped_quantity: props.body.sortOrder === "desc" ? "desc" : "asc" }]
      : [{ created_at: props.body.sortOrder === "desc" ? "desc" : "asc" }];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_shipments_order_items.findMany({
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
        ecommerce_mall_order_item_id: true,
        ecommerce_mall_shipment_id: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_shipments_order_items.count({
      where: whereInput,
    }),
  ]);
  const addressMap = new Map<string, IEcommerceMallAddress.ISummary>();
  const shipmentIds = Array.from(
    new Set(data.map((item) => item.ecommerce_mall_shipment_id)),
  );
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: {
      id: { in: shipmentIds },
      deleted_at: null,
    },
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
      trackingCodes: { select: { id: true } },
      order: {
        select: {
          id: true,
          order_number: true,
          total_price: true,
          status: true,
          shipping_address_id: true,
          created_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const shipmentMap = new Map<string, (typeof shipments)[number]>();
  shipments.forEach((shipment) => {
    shipmentMap.set(shipment.id, shipment);
  });
  const orderIds = Array.from(
    new Set(shipments.map((shipment) => shipment.ecommerce_mall_order_id)),
  );
  const addresses = await MyGlobal.prisma.ecommerce_mall_addresses.findMany({
    where: {
      id: { in: orderIds },
      deleted_at: null,
    },
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
  });
  addresses.forEach((address) => {
    addressMap.set(address.id, {
      id: address.id,
      recipient_name: address.recipient_name,
      recipient_phone: address.recipient_phone,
      street: address.street,
      city: address.city,
      state: address.state,
      is_default: address.is_default,
      created_at: toISOStringSafe(address.created_at),
      updated_at: toISOStringSafe(address.updated_at),
      deleted_at: address.deleted_at
        ? toISOStringSafe(address.deleted_at)
        : null,
    } satisfies IEcommerceMallAddress.ISummary);
  });
  const orderMap = new Map<string, IEcommerceMallOrder.ISummary>();
  orderIds.forEach((orderId) => {
    const addressId = shipments.find(
      (s) => s.ecommerce_mall_order_id === orderId,
    )?.order?.shipping_address_id;
    const address = addressId ? addressMap.get(addressId) : undefined;
    if (address) {
      orderMap.set(orderId, {
        id: orderId,
        order_number: "",
        total_price: 0,
        status: "",
        shipping_address: address,
        created_at: "",
        deleted_at: null,
      } satisfies IEcommerceMallOrder.ISummary);
    }
  });
  const orderItemIds = Array.from(
    new Set(data.map((item) => item.ecommerce_mall_order_item_id)),
  );
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      id: { in: orderItemIds },
      deleted_at: null,
    },
    select: {
      id: true,
      product_name: true,
      product_sku: true,
      variant_name: true,
      quantity: true,
      unit_price: true,
      total_price: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const orderItemMap = new Map<string, (typeof orderItems)[number]>();
  orderItems.forEach((orderItem) => {
    orderItemMap.set(orderItem.id, orderItem);
  });
  const dataWithRelations: IEcommerceMallShipmentsOrderItem.ISummary[] =
    data.map((item) => {
      const shipment = shipmentMap.get(item.ecommerce_mall_shipment_id)!;
      const orderItem = orderItemMap.get(item.ecommerce_mall_order_item_id)!;
      const order = orderMap.get(shipment.ecommerce_mall_order_id)!;
      return {
        id: item.id,
        shipped_quantity: item.shipped_quantity,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
        shipment: {
          id: shipment.id,
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
          order: order,
          trackingCount: shipment.trackingCodes.length,
        } satisfies IEcommerceMallShipment.ISummary,
        orderItem: {
          id: orderItem.id,
          productName: orderItem.product_name,
          productSku: orderItem.product_sku,
          variantName: orderItem.variant_name,
          quantity: orderItem.quantity,
          unitPrice: orderItem.unit_price,
          totalPrice: orderItem.total_price,
          order: order,
          createdAt: toISOStringSafe(orderItem.created_at),
          updatedAt: toISOStringSafe(orderItem.updated_at),
          deletedAt: orderItem.deleted_at
            ? toISOStringSafe(orderItem.deleted_at)
            : null,
          status: "paid" as const,
        } satisfies IEcommerceMallOrderItem.ISummary,
      } satisfies IEcommerceMallShipmentsOrderItem.ISummary;
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: dataWithRelations,
  } satisfies IPageIEcommerceMallShipmentsOrderItem.ISummary;
}
