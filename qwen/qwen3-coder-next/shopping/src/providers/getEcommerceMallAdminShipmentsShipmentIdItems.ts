import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentItemAtSummaryTransformer } from "../transformers/EcommerceMallShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminShipmentsShipmentIdItems(props: {
  admin: AdminPayload;
  shipmentId: string;
}): Promise<IPageIEcommerceMallShipmentItem.ISummary> {
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { ecommerce_mall_seller_id: true },
    });
  const data = await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
    where: { shipment_id: props.shipmentId },
    orderBy: { created_at: "desc" },
    ...EcommerceMallShipmentItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipment_items.count({
    where: { shipment_id: props.shipmentId },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: total === 0 ? 0 : 1,
    } satisfies IPage.IPagination,
  };
}
