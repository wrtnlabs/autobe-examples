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
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberShipments(props: {
  member: MemberPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const orderWhere = (
    props.body.shopping_mall_order_id
      ? {
          id: props.body.shopping_mall_order_id,
          deleted_at: null,
          shopping_customer_id: props.member.id,
        }
      : {
          deleted_at: null,
          shopping_customer_id: props.member.id,
        }
  ) satisfies Prisma.shopping_mall_ordersWhereInput;
  const accessibleOrders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: orderWhere,
    select: { id: true },
  });
  const accessibleOrderIds = accessibleOrders.map((o) => o.id);
  if (props.body.shopping_mall_order_id && accessibleOrderIds.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  const shipmentWhereBase = {
    deleted_at: null,
    shopping_mall_order_id: { in: accessibleOrderIds },
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}),
    ...(props.body.seller_snapshot_id !== undefined &&
    props.body.seller_snapshot_id !== null
      ? { seller_snapshot_id: props.body.seller_snapshot_id }
      : {}),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const sortInput = (() => {
    const sort = props.body.sort?.trim();
    if (!sort) return { created_at: "desc" as const };
    const [keyRaw, dirRaw] = sort.split(":").map((s) => s.trim());
    const dir = dirRaw?.toLowerCase() === "asc" ? "asc" : "desc";
    switch (keyRaw) {
      case "created_at":
        return { created_at: dir as "asc" | "desc" };
      case "updated_at":
        return { updated_at: dir as "asc" | "desc" };
      case "status":
        return { status: dir as "asc" | "desc" };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
  const whereInput = shipmentWhereBase;
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  const skip = (safePage - 1) * safeLimit;
  const shipments = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: safeLimit,
    orderBy: sortInput,
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  return {
    data: await ArrayUtil.asyncMap(
      shipments,
      ShoppingMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
  };
}
