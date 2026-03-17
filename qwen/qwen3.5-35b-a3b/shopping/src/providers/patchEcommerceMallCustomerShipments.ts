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
  // Validate sort field
  const validSortFields = [
    "created_at",
    "shipped_at",
    "delivered_at",
    "status",
    "carrier_name",
  ] as const;
  const sortField = props.body.sort
    ? validSortFields.includes(props.body.sort as any)
      ? (props.body.sort as (typeof validSortFields)[number])
      : "created_at"
    : "created_at";
  // Build where clause for customer's orders
  const customerOrderIds = await MyGlobal.prisma.ecommerce_mall_orders.findMany(
    {
      where: {
        customer_id: props.customer.id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  const orderIds = customerOrderIds.map((o) => o.id);
  // Build where clause for shipments
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    ecommerce_mall_order_id: { in: orderIds },
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
  };
  const orderByInput =
    sortField === "created_at"
      ? { created_at: "desc" as const }
      : sortField === "shipped_at"
        ? { shipped_at: "desc" as const }
        : sortField === "delivered_at"
          ? { delivered_at: "desc" as const }
          : sortField === "status"
            ? { status: "desc" as const }
            : { carrier_name: "desc" as const };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_shipments.findMany({
      where: whereInput,
      take: limit,
      skip,
      orderBy: orderByInput,
      ...EcommerceMallShipmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_shipments.count({ where: whereInput }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallShipmentAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
