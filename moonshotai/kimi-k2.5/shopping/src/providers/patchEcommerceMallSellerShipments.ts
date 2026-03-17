import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
    seller_id: props.seller.id,
    ...(props.body.orderId !== undefined &&
      props.body.orderId !== null && { order_id: props.body.orderId }),
    ...(props.body.carrierName && {
      carrier_name: { contains: props.body.carrierName },
    }),
    ...(props.body.trackingNumber && {
      tracking_number: { contains: props.body.trackingNumber },
    }),
    ...((props.body.shippedAtFrom || props.body.shippedAtTo) && {
      shipped_at: {
        ...(props.body.shippedAtFrom && { gte: props.body.shippedAtFrom }),
        ...(props.body.shippedAtTo && { lte: props.body.shippedAtTo }),
      },
    }),
  };
  const orderBy: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput[] = [];
  if (props.body.sort && props.body.sort.length > 0) {
    for (const sortField of props.body.sort) {
      const direction: "asc" | "desc" = sortField.startsWith("-")
        ? "desc"
        : "asc";
      const field = sortField.replace(/^[+-]/, "");
      if (field === "shippedAt") {
        orderBy.push({ shipped_at: direction });
      } else if (field === "createdAt") {
        orderBy.push({ created_at: direction });
      } else if (field === "updatedAt") {
        orderBy.push({ updated_at: direction });
      } else {
        orderBy.push({ shipped_at: direction });
      }
    }
  } else {
    orderBy.push({ shipped_at: "desc" });
  }
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({ where });
  const data = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
