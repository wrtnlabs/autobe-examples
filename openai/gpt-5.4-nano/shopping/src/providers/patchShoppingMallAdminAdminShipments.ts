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
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminShipments(props: {
  admin: AdminPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) throw new HttpException("Invalid page", 400);
  if (limit < 1 || limit > 100) throw new HttpException("Invalid limit", 400);
  const orderBy = (() => {
    const direction =
      props.body.sort && props.body.sort.endsWith(":asc")
        ? "asc"
        : props.body.sort && props.body.sort.endsWith(":desc")
          ? "desc"
          : "desc";
    const sortKey = (props.body.sort ?? "").split(":")[0]?.trim();
    const key = sortKey ?? "";
    if (key === "created_at") return { created_at: direction };
    if (key === "updated_at") return { updated_at: direction };
    if (key === "status") return { status: direction };
    if (!props.body.sort) return { created_at: "desc" };
    throw new HttpException("Invalid sort", 400);
  })() satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
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
  const skip = (page - 1) * limit;
  const items = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.shopping_mall_shipments.count({
    where,
  });
  const pages = Math.ceil(records / limit);
  return {
    data: await ArrayUtil.asyncMap(
      items,
      ShoppingMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages,
    } satisfies IPage.IPagination,
  };
}
