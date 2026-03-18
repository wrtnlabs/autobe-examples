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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminShipments(props: {
  admin: AdminPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  if (page < 1) throw new HttpException("Invalid page", 400);
  if (limit < 1 || limit > 100) throw new HttpException("Invalid limit", 400);
  const orderBy = (() => {
    const sort = props.body.sort;
    if (sort === undefined || sort === null || sort === "") {
      return {
        created_at: "desc" as const,
      } satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
    }
    const [key, dir] = sort.split("_");
    const direction = dir === "asc" ? "asc" : "desc";
    switch (key) {
      case "created":
      case "created_at":
        return {
          created_at: direction,
        } satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
      case "updated":
      case "updated_at":
        return {
          updated_at: direction,
        } satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
      case "status":
        return {
          status: direction,
        } satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
      default:
        return {
          created_at: "desc" as const,
        } satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
    }
  })();
  const where = {
    deleted_at: null,
    ...(props.body.shopping_mall_order_id
      ? { shopping_mall_order_id: props.body.shopping_mall_order_id }
      : {}),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.seller_snapshot_id
      ? { seller_snapshot_id: props.body.seller_snapshot_id }
      : {}),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        seller_snapshot_id: true,
        status: true,
        created_at: true,
        deleted_at: true,
        shopping_mall_order_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: records.map((s) => ({
      id: s.id as string & tags.Format<"uuid">,
      order: {
        id: s.shopping_mall_order_id as string & tags.Format<"uuid">,
        orderCode: "" as string,
        placedAt: toISOStringSafe(s.created_at),
        totalPrice: 0,
        overallStatus: "" as string,
        deletedAt: null,
      } satisfies IShoppingMallOrder.ISummary,
      sellerSnapshotId: s.seller_snapshot_id as string & tags.Format<"uuid">,
      status: s.status,
      trackingUrl: null,
      trackingNumber: null,
      carrierName: null,
      confirmationType: null,
      confirmedAt: null,
      createdAt: toISOStringSafe(s.created_at),
      deletedAt: s.deleted_at ? toISOStringSafe(s.deleted_at) : null,
    })),
  };
}
