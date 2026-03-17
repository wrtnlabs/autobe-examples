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

export async function patchShoppingMallAdminShipments(props: {
  admin: AdminPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_shipmentsWhereInput = {
    deleted_at: null,
    ...(props.body.order_id && { shopping_mall_order_id: props.body.order_id }),
    ...(props.body.status === "shipped" && { shipped_at: { not: null } }),
    ...(props.body.status === "delivered" && { delivered_at: { not: null } }),
    ...(props.body.date_from && {
      created_at: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to && {
      created_at: { lte: new Date(props.body.date_to) },
    }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const sortField = props.body.sort?.split(",")[0] ?? "created_at";
  const sortOrder = (props.body.sort?.split(",")[1] ?? "desc") as
    | "asc"
    | "desc";
  const orderByInput: Prisma.shopping_mall_shipmentsOrderByWithRelationInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
