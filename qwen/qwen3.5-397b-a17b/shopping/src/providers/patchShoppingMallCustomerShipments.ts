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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerShipments(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    order: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
    ...(props.body.order_id && {
      shopping_mall_order_id: props.body.order_id,
    }),
    ...(props.body.status === "shipped" && {
      shipped_at: { not: null },
    }),
    ...(props.body.status === "delivered" && {
      delivered_at: { not: null },
    }),
    ...(props.body.date_from && {
      created_at: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to && {
      created_at: { lte: new Date(props.body.date_to) },
    }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const orderByInput = (() => {
    if (props.body.sort) {
      const parts = props.body.sort.split(",");
      const field = parts[0];
      const order = (parts[1] ?? "desc") as "asc" | "desc";
      if (
        field === "created_at" ||
        field === "shipped_at" ||
        field === "delivered_at"
      ) {
        return { [field]: order };
      }
    }
    return { created_at: "desc" as const };
  })() satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
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
