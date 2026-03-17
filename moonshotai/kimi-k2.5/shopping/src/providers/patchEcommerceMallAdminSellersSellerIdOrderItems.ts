import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellersSellerIdOrderItems(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.ecommerce_mall_order_itemsWhereInput = {
    seller_id: props.sellerId,
    deleted_at: null,
  };
  // Apply status filter
  if (props.body.status !== undefined) {
    whereConditions.status = props.body.status;
  }
  // Apply orderId filter
  if (props.body.orderId !== undefined) {
    whereConditions.order_id = props.body.orderId;
  }
  // Apply productId filter
  if (props.body.productId !== undefined) {
    whereConditions.product_id = props.body.productId;
  }
  // Apply variantId filter
  if (props.body.variantId !== undefined) {
    whereConditions.variant_id = props.body.variantId;
  }
  // Apply date range filters
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    whereConditions.created_at = {};
    if (props.body.createdAtFrom !== undefined) {
      whereConditions.created_at.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo !== undefined) {
      whereConditions.created_at.lte = new Date(props.body.createdAtTo);
    }
  }
  // Apply search filter on product name
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereConditions.product = {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    };
  }
  // Determine sort order
  const sortField = props.body.sort ?? "created_at";
  const sortDirection = props.body.order ?? "desc";
  const orderBy: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput =
    sortField === "seller_id"
      ? { seller_id: sortDirection }
      : sortField === "price_at_purchase"
        ? { price_at_purchase: sortDirection }
        : sortField === "quantity"
          ? { quantity: sortDirection }
          : sortField === "status"
            ? { status: sortDirection }
            : { created_at: sortDirection };
  // Query order items with pagination
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereConditions,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    orderItems,
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
