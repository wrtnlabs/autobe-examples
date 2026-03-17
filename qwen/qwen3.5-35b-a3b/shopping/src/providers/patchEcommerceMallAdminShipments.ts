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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipments(props: {
  admin: AdminPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.carrier_name && {
      carrier_name: {
        contains: props.body.carrier_name,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at && {
      created_at: { gte: new Date(props.body.created_at) },
    }),
    ...(props.body.shipped_at && {
      shipped_at: { gte: new Date(props.body.shipped_at) },
    }),
    ...(props.body.delivered_at && {
      delivered_at: { gte: new Date(props.body.delivered_at) },
    }),
    ...(props.body.estimated_delivery_at && {
      estimated_delivery_at: {
        gte: new Date(props.body.estimated_delivery_at),
      },
    }),
  } satisfies Prisma.ecommerce_mall_shipmentsWhereInput;
  // Build orderBy clause
  const orderByInput: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput =
    (() => {
      switch (props.body.sort) {
        case "shipped_at":
          return { shipped_at: "desc" as const };
        case "delivered_at":
          return { delivered_at: "desc" as const };
        case "status":
          return { status: "asc" as const };
        case "carrier_name":
          return { carrier_name: "asc" as const };
        default:
          return { created_at: "desc" as const };
      }
    })();
  // Fetch shipments and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_shipments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallShipmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_shipments.count({
      where: whereInput,
    }),
  ]);
  // Handle edge case where total is 0
  const pages =
    total === 0
      ? 0
      : (Math.ceil(total / limit) as number &
          tags.Type<"int32"> &
          tags.Minimum<0>);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages,
    } satisfies IPage.IPagination,
  };
}
