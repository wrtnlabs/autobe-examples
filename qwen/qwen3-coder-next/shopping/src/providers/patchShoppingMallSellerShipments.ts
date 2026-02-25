import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Handle automatic delivery confirmation for shipments older than 14 days
  await MyGlobal.prisma.$executeRaw`
    UPDATE shopping_mall_shipments
    SET auto_confirmed_at = shipped_at + INTERVAL '14 days'
    WHERE shopping_mall_seller_id = ${props.seller.id}
      AND customer_confirmed_at IS NULL
      AND auto_confirmed_at IS NULL
      AND shipped_at + INTERVAL '14 days' <= NOW();
  `;
  // Build where clause for seller-specific shipments
  const where: Prisma.shopping_mall_shipmentsWhereInput = {
    shopping_mall_seller_id: props.seller.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.tracking_number && {
      tracking_number: { contains: props.body.tracking_number },
    }),
    ...(props.body.tracking_carrier && {
      tracking_carrier: { contains: props.body.tracking_carrier },
    }),
    ...(props.body.created_at_start && {
      shipped_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      shipped_at: { lte: props.body.created_at_end },
    }),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  // Retrieve shipments with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_shipments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { shipped_at: "desc" },
      select: {
        id: true,
        tracking_number: true,
        tracking_carrier: true,
        status: true,
        shipped_at: true,
        customer_confirmed_at: true,
        auto_confirmed_at: true,
        cancelled_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_shipments.count({ where }),
  ]);
  // Transform to summary format with proper date formatting
  const summaryData: IShoppingMallShipment.ISummary[] = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    tracking_number: item.tracking_number,
    tracking_carrier: item.tracking_carrier,
    status: item.status,
    shipped_at: toISOStringSafe(item.shipped_at) as string &
      tags.Format<"date-time">,
    customer_confirmed_at: (item.customer_confirmed_at
      ? toISOStringSafe(item.customer_confirmed_at)
      : null) as (string & tags.Format<"date-time">) | null,
    auto_confirmed_at: (item.auto_confirmed_at
      ? toISOStringSafe(item.auto_confirmed_at)
      : null) as (string & tags.Format<"date-time">) | null,
    cancelled_at: (item.cancelled_at
      ? toISOStringSafe(item.cancelled_at)
      : null) as (string & tags.Format<"date-time">) | null,
  }));
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallShipment.ISummary;
}
