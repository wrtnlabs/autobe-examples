import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with seller isolation
  const whereInput: Prisma.shopping_mall_shipmentsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
  };
  // Apply status filter (derived from delivered_at and delivery_confirmed)
  if (props.body.status === "pending") {
    whereInput.delivered_at = null;
  } else if (props.body.status === "delivered") {
    whereInput.AND = [
      { delivered_at: { not: null } },
      { delivery_confirmed: false },
    ];
  } else if (props.body.status === "confirmed") {
    whereInput.delivery_confirmed = true;
  }
  // Apply tracking carrier filter (case-insensitive partial match)
  if (props.body.tracking_carrier !== undefined) {
    whereInput.tracking_carrier = {
      contains: props.body.tracking_carrier,
      mode: "insensitive",
    };
  }
  // Apply tracking number filter (case-insensitive partial match)
  if (props.body.tracking_number !== undefined) {
    whereInput.tracking_number = {
      contains: props.body.tracking_number,
      mode: "insensitive",
    };
  }
  // Apply shipped_at range filters
  if (
    props.body.shipped_at_from !== undefined ||
    props.body.shipped_at_to !== undefined
  ) {
    const shippedAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.shipped_at_from !== undefined) {
      shippedAtFilter.gte = new Date(props.body.shipped_at_from);
    }
    if (props.body.shipped_at_to !== undefined) {
      shippedAtFilter.lte = new Date(props.body.shipped_at_to);
    }
    whereInput.shipped_at = shippedAtFilter;
  }
  // Apply delivered_at range filters (only if not already set by status filter)
  if (
    (props.body.delivered_at_from !== undefined ||
      props.body.delivered_at_to !== undefined) &&
    props.body.status !== "pending"
  ) {
    const deliveredAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.delivered_at_from !== undefined) {
      deliveredAtFilter.gte = new Date(props.body.delivered_at_from);
    }
    if (props.body.delivered_at_to !== undefined) {
      deliveredAtFilter.lte = new Date(props.body.delivered_at_to);
    }
    whereInput.delivered_at = deliveredAtFilter;
  }
  // Fetch shipments with pagination
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallShipmentAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIShoppingMallShipment.ISummary;
}
