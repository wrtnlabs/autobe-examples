import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const order = props.body.order ?? "desc";
  const sort = props.body.sort ?? "shipped_at";
  const orderBy: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput =
    sort === "carrier_name"
      ? { carrier_name: order }
      : sort === "created_at"
        ? { created_at: order }
        : { shipped_at: order };
  const shippedAtConditions: Prisma.DateTimeFilter | undefined =
    props.body.shippedAtFrom || props.body.shippedAtTo
      ? {
          ...(props.body.shippedAtFrom && {
            gte: new Date(props.body.shippedAtFrom),
          }),
          ...(props.body.shippedAtTo && {
            lte: new Date(props.body.shippedAtTo),
          }),
        }
      : undefined;
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    seller_id: props.seller.id,
    ...(props.body.orderId && { order_id: props.body.orderId }),
    ...(props.body.carrierName && {
      carrier_name: { contains: props.body.carrierName, mode: "insensitive" },
    }),
    ...(shippedAtConditions && { shipped_at: shippedAtConditions }),
    ...(props.body.status && {
      delivery:
        props.body.status === "delivered" ? { isNot: null } : { is: null },
    }),
    ...(props.body.search && {
      OR: [
        { carrier_name: { contains: props.body.search, mode: "insensitive" } },
        {
          tracking_number: { contains: props.body.search, mode: "insensitive" },
        },
      ],
    }),
  };
  const data = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: whereInput,
  });
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallShipmentAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
