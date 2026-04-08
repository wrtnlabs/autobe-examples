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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerShipments(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderBy: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput =
    props.body.sort === "carrier_name"
      ? { carrier_name: props.body.order ?? "desc" }
      : props.body.sort === "created_at"
        ? { created_at: props.body.order ?? "desc" }
        : { shipped_at: props.body.order ?? "desc" };
  const where: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
    order: {
      customer_id: props.customer.id,
    },
    ...(props.body.orderId !== null && { order_id: props.body.orderId }),
    ...(props.body.sellerId !== null && { seller_id: props.body.sellerId }),
    ...(props.body.carrierName !== null && {
      carrier_name: { contains: props.body.carrierName, mode: "insensitive" },
    }),
    ...(props.body.status !== null && {
      delivery:
        props.body.status === "delivered" ? { isNot: null } : { is: null },
    }),
    ...(props.body.shippedAtFrom !== null &&
      props.body.shippedAtTo !== null && {
        shipped_at: {
          gte: props.body.shippedAtFrom,
          lte: props.body.shippedAtTo,
        } satisfies Prisma.DateTimeFilter as Prisma.DateTimeFilter,
      }),
    ...(props.body.shippedAtFrom !== null &&
      props.body.shippedAtTo === null && {
        shipped_at: {
          gte: props.body.shippedAtFrom,
        } satisfies Prisma.DateTimeFilter as Prisma.DateTimeFilter,
      }),
    ...(props.body.shippedAtFrom === null &&
      props.body.shippedAtTo !== null && {
        shipped_at: {
          lte: props.body.shippedAtTo,
        } satisfies Prisma.DateTimeFilter as Prisma.DateTimeFilter,
      }),
    ...(props.body.search !== null && {
      OR: [
        {
          carrier_name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          tracking_number: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
  };
  const data = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where,
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
