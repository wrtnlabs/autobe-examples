import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallShipmentItemAtSummaryTransformer } from "../transformers/ShoppingMallShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminShipmentsShipmentIdItems(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentItem.IRequest;
}): Promise<IPageIShoppingMallShipmentItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
  });
  const whereInput = {
    shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      orderItem: {
        status: props.body.status,
      },
    }),
  } satisfies Prisma.shopping_mall_shipment_itemsWhereInput;
  const orderByInput = buildOrderBy(props.body.sort);
  const data = await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallShipmentItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipment_items.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
function buildOrderBy(
  sort: string[] | undefined,
): Prisma.shopping_mall_shipment_itemsOrderByWithRelationInput {
  if (!sort || sort.length === 0) {
    return { created_at: "asc" };
  }
  const validFields = [
    "quantity",
    "unit_price",
    "status",
    "created_at",
  ] as const;
  const validDirections = ["asc", "desc"] as const;
  for (const expr of sort) {
    const parts = expr.split(",");
    if (parts.length !== 2) {
      continue;
    }
    const [field, direction] = parts as [string, string];
    if (
      validFields.includes(field as (typeof validFields)[number]) &&
      validDirections.includes(direction as (typeof validDirections)[number])
    ) {
      return {
        orderItem: {
          [field as (typeof validFields)[number]]:
            direction as (typeof validDirections)[number],
        },
      };
    }
  }
  return { created_at: "asc" };
}
