import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentLog";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentLogAtSummaryTransformer } from "../transformers/ShoppingMallShipmentLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipmentLogs(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentLog.IRequest;
}): Promise<IPageIShoppingMallShipmentLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shipment: {
      seller_id: props.seller.id,
    },
    ...(props.body.shopping_mall_shipment_id && {
      shopping_mall_shipment_id: props.body.shopping_mall_shipment_id,
    }),
    ...(props.body.event_type && { event_type: props.body.event_type }),
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.actor_id !== undefined && {
      actor_id: props.body.actor_id === null ? undefined : props.body.actor_id,
    }),
    ...(props.body.old_status !== undefined && {
      old_status:
        props.body.old_status === null ? undefined : props.body.old_status,
    }),
    ...(props.body.new_status !== undefined && {
      new_status:
        props.body.new_status === null ? undefined : props.body.new_status,
    }),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to && { lte: props.body.created_at_to }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_shipment_logsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipment_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallShipmentLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_shipment_logs.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
