import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberShipments(props: {
  member: MemberPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Invalid page", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit", 400);
  }
  const skip = (page - 1) * limit;
  const orderScopeId = props.body.shopping_mall_order_id;
  const statusFilter = props.body.status;
  const sellerSnapshotIdFilter = props.body.seller_snapshot_id;
  const sort = props.body.sort;
  const orderBy = (() => {
    if (sort === "created_at_desc") {
      return { created_at: "desc" as const };
    }
    if (sort === "created_at_asc") {
      return { created_at: "asc" as const };
    }
    if (sort === "updated_at_desc") {
      return { updated_at: "desc" as const };
    }
    if (sort === "updated_at_asc") {
      return { updated_at: "asc" as const };
    }
    if (sort === "status_desc") {
      return { status: "desc" as const };
    }
    if (sort === "status_asc") {
      return { status: "asc" as const };
    }
    return { created_at: "desc" as const };
  })();
  const whereShipments = {
    deleted_at: null,
    ...(orderScopeId !== undefined && { shopping_mall_order_id: orderScopeId }),
    ...(statusFilter !== undefined && { status: statusFilter }),
    ...(sellerSnapshotIdFilter !== undefined && {
      seller_snapshot_id: sellerSnapshotIdFilter,
    }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const shipments = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereShipments,
    skip,
    take: limit,
    orderBy:
      orderBy satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput,
    select: {
      id: true,
      shopping_mall_order_id: true,
      seller_snapshot_id: true,
      status: true,
      created_at: true,
      deleted_at: true,
      order: {
        select: {
          id: true,
          order_code: true,
          placed_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const recordCount = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereShipments,
  });
  const orderIds = Array.from(
    new Set(shipments.map((s) => s.shopping_mall_order_id)),
  );
  type OrderItemRow = {
    shopping_mall_order_id: string;
    quantity: number;
    seller_price_at_purchase: number;
    line_item_status: string;
  };
  const orderItemsByOrderId = new Map<string, OrderItemRow[]>();
  if (orderIds.length > 0) {
    const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany(
      {
        where: {
          shopping_mall_order_id: { in: orderIds },
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        select: {
          shopping_mall_order_id: true,
          quantity: true,
          seller_price_at_purchase: true,
          line_item_status: true,
        },
      },
    );
    for (const item of orderItems as OrderItemRow[]) {
      const list = orderItemsByOrderId.get(item.shopping_mall_order_id) ?? [];
      list.push(item);
      orderItemsByOrderId.set(item.shopping_mall_order_id, list);
    }
  }
  const shipmentIds = shipments.map((s) => s.id);
  const confirmations =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findMany({
      where: {
        deleted_at: null,
        shopping_mall_shipment_id: { in: shipmentIds },
      },
      orderBy: { confirmed_at: "desc" },
      select: {
        shopping_mall_shipment_id: true,
        tracking_url: true,
        tracking_number: true,
        carrier_name: true,
        confirmation_type: true,
        confirmed_at: true,
      },
    });
  const latestConfirmationByShipmentId = new Map<
    string,
    (typeof confirmations)[number]
  >();
  for (const c of confirmations) {
    if (!latestConfirmationByShipmentId.has(c.shopping_mall_shipment_id)) {
      latestConfirmationByShipmentId.set(c.shopping_mall_shipment_id, c);
    }
  }
  const data: IShoppingMallShipment.ISummary[] = shipments.map((s) => {
    const orderItems = orderItemsByOrderId.get(s.shopping_mall_order_id) ?? [];
    const totalPrice = orderItems.reduce(
      (acc, it) => acc + it.seller_price_at_purchase * it.quantity,
      0,
    );
    const overallStatus =
      orderItems.length > 0 ? orderItems[0].line_item_status : "";
    const orderSummary: IShoppingMallOrder.ISummary = {
      id: s.order.id,
      orderCode: s.order.order_code,
      placedAt: toISOStringSafe(s.order.placed_at),
      totalPrice,
      overallStatus,
      deletedAt:
        s.order.deleted_at === null
          ? null
          : toISOStringSafe(s.order.deleted_at),
    };
    const latest = latestConfirmationByShipmentId.get(s.id) ?? null;
    return {
      id: s.id,
      order: orderSummary,
      sellerSnapshotId: s.seller_snapshot_id,
      status: s.status,
      trackingUrl: latest === null ? null : latest.tracking_url,
      trackingNumber: latest === null ? null : latest.tracking_number,
      carrierName: latest === null ? null : latest.carrier_name,
      confirmationType: latest === null ? null : latest.confirmation_type,
      confirmedAt:
        latest === null ? null : toISOStringSafe(latest.confirmed_at),
      createdAt: toISOStringSafe(s.created_at),
      deletedAt: s.deleted_at === null ? null : toISOStringSafe(s.deleted_at),
    };
  });
  const pages = Math.ceil(recordCount / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: recordCount,
      pages,
    },
  } satisfies IPageIShoppingMallShipment.ISummary;
}
