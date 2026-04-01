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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallShipmentLogAtSummaryTransformer } from "../transformers/ShoppingMallShipmentLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorShipmentLogs(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallShipmentLog.IRequest;
}): Promise<IPageIShoppingMallShipmentLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.shopping_mall_shipment_id !== undefined && {
      shopping_mall_shipment_id: props.body.shopping_mall_shipment_id,
    }),
    ...(props.body.event_type !== undefined && {
      event_type: props.body.event_type,
    }),
    ...(props.body.actor_type !== undefined && {
      actor_type: props.body.actor_type,
    }),
    ...(props.body.actor_id !== undefined && {
      actor_id: props.body.actor_id,
    }),
    ...(props.body.old_status !== undefined && {
      old_status: props.body.old_status,
    }),
    ...(props.body.new_status !== undefined && {
      new_status: props.body.new_status,
    }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: props.body.created_at_to,
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_shipment_logsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_shipment_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallShipmentLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipment_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
