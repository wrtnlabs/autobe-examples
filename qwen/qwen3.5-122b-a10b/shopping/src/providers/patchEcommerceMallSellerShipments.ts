import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
  const sortBy = props.body.sortBy ?? "shipped_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput = {
    deleted_at: null,
    seller_id: props.seller.id,
    ...(props.body.trackingNumber && {
      tracking_number: {
        contains: props.body.trackingNumber,
        mode: "insensitive",
      },
    }),
    ...(props.body.carrierName && {
      carrier_name: {
        contains: props.body.carrierName,
        mode: "insensitive",
      },
    }),
    ...(props.body.shippedAtFrom && {
      shipped_at: {
        gte: new Date(props.body.shippedAtFrom),
      },
    }),
    ...(props.body.shippedAtTo && {
      shipped_at: {
        lte: new Date(props.body.shippedAtTo),
      },
    }),
    ...(props.body.deliveredAtFrom && {
      OR: [
        {
          delivered_at: {
            gte: new Date(props.body.deliveredAtFrom),
          },
        },
        {
          delivered_at: null,
        },
      ],
    }),
    ...(props.body.deliveredAtTo && {
      delivered_at: {
        lte: new Date(props.body.deliveredAtTo),
      },
    }),
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: whereInput,
  });
  return {
    data: await Promise.all(
      data.map((shipment) =>
        EcommerceMallShipmentAtSummaryTransformer.transform(shipment),
      ),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallShipment.ISummary;
}
