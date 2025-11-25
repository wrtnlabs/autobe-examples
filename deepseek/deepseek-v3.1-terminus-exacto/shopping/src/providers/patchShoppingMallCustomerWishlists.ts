import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where condition with security filtering
  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
    // Security: customer can only see their own wishlists or public ones
    OR: [{ shopping_mall_customer_id: props.customer.id }, { is_public: true }],
  };

  // Apply search filter (combine with security filter using AND)
  if (props.body.search) {
    whereCondition.AND = [
      whereCondition,
      {
        OR: [
          { name: { contains: props.body.search, mode: "insensitive" } },
          { description: { contains: props.body.search, mode: "insensitive" } },
        ],
      },
    ];
  }

  // Apply status filter
  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  // Apply public/private filter
  if (props.body.is_public !== undefined) {
    whereCondition.is_public = props.body.is_public;
  }

  // Apply priority range filter
  if (
    props.body.priority_min !== undefined ||
    props.body.priority_max !== undefined
  ) {
    const priorityCondition: Record<string, unknown> = {};
    if (props.body.priority_min !== undefined) {
      priorityCondition.gte = props.body.priority_min;
    }
    if (props.body.priority_max !== undefined) {
      priorityCondition.lte = props.body.priority_max;
    }
    whereCondition.priority = priorityCondition;
  }

  // Apply customer filter (only if it matches authenticated customer)
  if (
    props.body.customer_id !== undefined &&
    props.body.customer_id === props.customer.id
  ) {
    whereCondition.shopping_mall_customer_id = props.body.customer_id;
  }

  // Build orderBy
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order ?? "desc";
  orderBy[orderField] = orderDirection;

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlists.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_wishlists.count({
      where: whereCondition,
    }),
  ]);

  // Transform data to match ISummary interface
  const transformedData = data.map((wishlist) => ({
    id: wishlist.id,
    name: wishlist.name,
    description: wishlist.description ?? undefined,
    is_public: wishlist.is_public,
    priority: wishlist.priority,
    status: wishlist.status,
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
    shopping_mall_customer_id: wishlist.shopping_mall_customer_id,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
