import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentsOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipmentsOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentsOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentsOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallShipmentsOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipmentsShipmentIdOrderItems(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallShipmentsOrderItem.IRequest;
}): Promise<IPageIEcommerceMallShipmentsOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
    });
  const whereInput = {
    ecommerce_mall_shipment_id: props.shipmentId,
    deleted_at: null,
    ...(props.body.shippedQuantity !== undefined && {
      shipped_quantity: props.body.shippedQuantity,
    }),
  } satisfies Prisma.ecommerce_mall_shipments_order_itemsWhereInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy:
        props.body.sortBy === "shipped_quantity"
          ? { shipped_quantity: props.body.sortOrder ?? ("asc" as const) }
          : { created_at: props.body.sortOrder ?? ("asc" as const) },
      ...EcommerceMallShipmentsOrderItemAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_shipments_order_items.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentsOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
