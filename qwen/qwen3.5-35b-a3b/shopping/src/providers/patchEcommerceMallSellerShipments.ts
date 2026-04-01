import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    ecommerce_mall_seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.carrier_name !== undefined && {
      carrier_name: {
        contains: props.body.carrier_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.created_at !== undefined && {
      created_at: { gte: props.body.created_at },
    }),
    ...(props.body.shipped_at !== undefined && {
      shipped_at: { gte: props.body.shipped_at },
    }),
    ...(props.body.delivered_at !== undefined && {
      delivered_at: { gte: props.body.delivered_at },
    }),
    ...(props.body.estimated_delivery_at !== undefined && {
      estimated_delivery_at: { gte: props.body.estimated_delivery_at },
    }),
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput[] =
    (
      props.body.sort === "shipped_at"
        ? [{ shipped_at: "desc" as const }]
        : props.body.sort === "delivered_at"
          ? [{ delivered_at: "desc" as const }]
          : props.body.sort === "status"
            ? [{ status: "asc" as const }]
            : props.body.sort === "carrier_name"
              ? [{ carrier_name: "asc" as const }]
              : [{ created_at: "desc" as const }]
    ) satisfies Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput[];
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
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallShipmentAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallShipment.ISummary;
}
