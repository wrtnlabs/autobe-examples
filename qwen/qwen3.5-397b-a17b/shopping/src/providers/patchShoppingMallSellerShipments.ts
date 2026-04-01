import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const shippedAtConditions: Prisma.DateTimeFilter = {};
  if (props.body.shipped_at_from !== undefined) {
    shippedAtConditions.gte = new Date(props.body.shipped_at_from);
  }
  if (props.body.shipped_at_to !== undefined) {
    shippedAtConditions.lte = new Date(props.body.shipped_at_to);
  }
  const whereInput: Prisma.shopping_mall_shipmentsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.tracking_carrier !== undefined && {
      tracking_carrier: props.body.tracking_carrier,
    }),
    ...(props.body.tracking_number !== undefined && {
      tracking_number: { contains: props.body.tracking_number },
    }),
    ...(Object.keys(shippedAtConditions).length > 0 && {
      shipped_at: shippedAtConditions,
    }),
    ...(props.body.confirmed !== undefined && {
      confirmed_at: props.body.confirmed ? { not: null } : null,
    }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { shipped_at: "desc" },
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
