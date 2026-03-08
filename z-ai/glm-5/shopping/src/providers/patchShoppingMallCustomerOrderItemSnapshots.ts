import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrderItemSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  // Build order item where clause for customer access control and order filter
  const orderItemWhere: Prisma.shopping_mall_order_itemsWhereInput = {
    order: {
      shopping_mall_customer_id: props.customer.id,
    },
  };
  if (props.body.orderId !== undefined) {
    orderItemWhere.shopping_mall_order_id = props.body.orderId;
  }
  // Build main where clause
  const where: Prisma.shopping_mall_order_item_snapshotsWhereInput = {
    orderItem: orderItemWhere,
  };
  // Apply order item filter
  if (props.body.orderItemId !== undefined) {
    where.order_item_id = props.body.orderItemId;
  }
  // Apply product name filter (case-insensitive partial match)
  if (props.body.productName !== undefined) {
    where.product_name = {
      contains: props.body.productName,
      mode: "insensitive",
    } satisfies Prisma.StringFilter;
  }
  // Apply seller shop name filter (exact match)
  if (props.body.sellerShopName !== undefined) {
    where.seller_shop_name = props.body.sellerShopName;
  }
  // Apply price range filter
  if (props.body.priceMin !== undefined || props.body.priceMax !== undefined) {
    where.price = {};
    if (props.body.priceMin !== undefined) {
      where.price.gte = props.body.priceMin;
    }
    if (props.body.priceMax !== undefined) {
      where.price.lte = props.body.priceMax;
    }
  }
  // Apply date range filter
  if (
    props.body.createdFrom !== undefined ||
    props.body.createdTo !== undefined
  ) {
    where.created_at = {};
    if (props.body.createdFrom !== undefined) {
      where.created_at.gte = new Date(props.body.createdFrom);
    }
    if (props.body.createdTo !== undefined) {
      where.created_at.lte = new Date(props.body.createdTo);
    }
  }
  // Pagination settings
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Parse sort parameter
  const sortValue = props.body.sort ?? "created_at:desc";
  let orderBy: Prisma.shopping_mall_order_item_snapshotsOrderByWithRelationInput;
  switch (sortValue) {
    case "created_at:desc":
      orderBy = { created_at: "desc" };
      break;
    case "created_at:asc":
      orderBy = { created_at: "asc" };
      break;
    case "price:desc":
      orderBy = { price: "desc" };
      break;
    case "price:asc":
      orderBy = { price: "asc" };
      break;
    default:
      throw new HttpException("Invalid sort parameter", 400);
  }
  // Execute queries
  const selectClause =
    ShoppingMallOrderItemSnapshotAtSummaryTransformer.select();
  const data =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...selectClause,
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
