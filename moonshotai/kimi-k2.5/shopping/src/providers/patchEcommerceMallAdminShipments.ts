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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminShipments(props: {
  admin: AdminPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const shippedAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.shippedAtFrom) {
    shippedAtFilter.gte = new Date(props.body.shippedAtFrom);
  }
  if (props.body.shippedAtTo) {
    shippedAtFilter.lte = new Date(props.body.shippedAtTo);
  }
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
    ...(props.body.orderId && { order_id: props.body.orderId }),
    ...(props.body.sellerId && { seller_id: props.body.sellerId }),
    ...(props.body.carrierName && {
      carrier_name: {
        contains: props.body.carrierName,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.status === "delivered" && {
      delivery: {
        is: {},
      },
    }),
    ...(props.body.status === "in_transit" && {
      delivery: {
        is: null,
      },
    }),
    ...(Object.keys(shippedAtFilter).length > 0 && {
      shipped_at: shippedAtFilter,
    }),
    ...(props.body.search && {
      OR: [
        {
          carrier_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          tracking_number: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };
  const orderByField = props.body.sort ?? "shipped_at";
  const orderDirection = props.body.order ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput =
    orderByField === "carrier_name"
      ? { carrier_name: orderDirection }
      : orderByField === "created_at"
        ? { created_at: orderDirection }
        : { shipped_at: orderDirection };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_shipments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        seller: {
          include: {
            registrations: true,
          },
        },
        order: {
          include: {
            customer: true,
          },
        },
        shipmentItems: true,
        delivery: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_shipments.count({
      where: whereInput,
    }),
  ]);
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
