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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentItemAtSummaryTransformer } from "../transformers/EcommerceMallShipmentItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerShipmentsShipmentIdItems(props: {
  customer: CustomerPayload;
  shipmentId: string;
}): Promise<IPageIEcommerceMallShipmentItem.ISummary> {
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (shipment.ecommerce_mall_seller_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = 1;
  const limit = 100;
  const skip = 0;
  const data = await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
    where: { shipment_id: props.shipmentId },
    skip,
    take: limit,
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
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIEcommerceMallShipmentItem.ISummary;
}
