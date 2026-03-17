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

export async function patchEcommerceMallAdminShipmentsSearch(props: {
  admin: AdminPayload;
  body: IEcommerceMallShipment.IRequest;
}): Promise<IPageIEcommerceMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_shipmentsWhereInput = {
    deleted_at: null,
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
    ...(props.body.sellerId && {
      seller_id: props.body.sellerId,
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
    ...(props.body.orderNumber && {
      orderItems: {
        some: {
          order: {
            order_number: {
              contains: props.body.orderNumber,
              mode: "insensitive",
            },
          },
        },
      },
    }),
  };
  // Build orderBy
  const sortBy = props.body.sortBy ?? "shipped_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_shipmentsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };
  // Query shipments
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    shipments,
    EcommerceMallShipmentAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
