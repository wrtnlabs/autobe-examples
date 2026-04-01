import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartSnapshot";
import { IShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCartSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCartItemsCartItemIdSnapshots(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartSnapshot.IRequest;
}): Promise<IPageIShoppingMallCartSnapshot.ISummary> {
  // Verify cart item exists and belongs to customer
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: {
        id: props.cartItemId,
      },
      select: {
        shopping_mall_customer_id: true,
      },
    });
  // Verify ownership
  if (cartItem.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build WHERE clause
  const whereInput: Prisma.shopping_mall_cart_snapshotsWhereInput = {
    shopping_mall_cart_item_id: props.cartItemId,
  };
  // Build created_at filter
  const createdAtFilter = {} as Partial<{
    gte: Date;
    lte: Date;
  }>;
  if (props.body.from !== undefined) {
    createdAtFilter.gte = new Date(props.body.from);
  }
  if (props.body.to !== undefined) {
    createdAtFilter.lte = new Date(props.body.to);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  // Build quantity filter
  const quantityFilter = {} as Partial<{
    gte: number;
    lte: number;
  }>;
  if (props.body.min !== undefined) {
    quantityFilter.gte = props.body.min;
  }
  if (props.body.max !== undefined) {
    quantityFilter.lte = props.body.max;
  }
  if (Object.keys(quantityFilter).length > 0) {
    whereInput.quantity = quantityFilter;
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots
  const data = await MyGlobal.prisma.shopping_mall_cart_snapshots.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...ShoppingMallCartSnapshotAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_cart_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallCartSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
