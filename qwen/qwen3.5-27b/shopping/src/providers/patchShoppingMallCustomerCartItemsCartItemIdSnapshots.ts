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
  await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
    where: {
      id: props.cartItemId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Build where clause with filters
  const whereInput = {
    shopping_mall_cart_item_id: props.cartItemId,
    ...(props.body.from && { created_at: { gte: new Date(props.body.from) } }),
    ...(props.body.to && { created_at: { lte: new Date(props.body.to) } }),
    ...(props.body.min && { quantity: { gte: props.body.min } }),
    ...(props.body.max && { quantity: { lte: props.body.max } }),
  } satisfies Prisma.shopping_mall_cart_snapshotsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots
  const data = await MyGlobal.prisma.shopping_mall_cart_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallCartSnapshotAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.shopping_mall_cart_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallCartSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: transformed,
  };
}
