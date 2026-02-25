import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorReviewSnapshotsHistory(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  // Build Prisma where filter
  const where: Prisma.shopping_mall_review_snapshotsWhereInput = {};
  if (props.body.id !== undefined) {
    where.id = props.body.id;
  }
  if (props.body.shoppingMallProductReviewId !== undefined) {
    where.shopping_mall_product_review_id =
      props.body.shoppingMallProductReviewId;
  }
  if (props.body.ratingMin !== undefined) {
    where.rating = { gte: props.body.ratingMin };
  }
  if (props.body.ratingMax !== undefined) {
    where.rating = where.rating ?? {};
    (where.rating as Prisma.IntFilter).lte = props.body.ratingMax;
  }
  if (props.body.snapshotCreatedFrom !== undefined) {
    where.snapshot_created_at = { gte: props.body.snapshotCreatedFrom };
  }
  if (props.body.snapshotCreatedTo !== undefined) {
    where.snapshot_created_at = where.snapshot_created_at ?? {};
    (where.snapshot_created_at as Prisma.DateTimeFilter).lte =
      props.body.snapshotCreatedTo;
  }
  if (props.body.createdFrom !== undefined) {
    where.created_at = { gte: props.body.createdFrom };
  }
  if (props.body.createdTo !== undefined) {
    where.created_at = where.created_at ?? {};
    (where.created_at as Prisma.DateTimeFilter).lte = props.body.createdTo;
  }
  if (props.body.body !== undefined) {
    where.body = { contains: props.body.body };
  }
  // Pagination
  const skip = (page - 1) * limit;
  // Total count
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where,
  });
  // Query data
  const data = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy: { snapshot_created_at: "desc" },
  });
  // Prepare empty nested summary objects
  const emptyCustomerSummary: IShoppingMallCustomer.ISummary = {
    id: "",
    email: "",
    displayName: null,
    phoneNumber: null,
    createdAt: "1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
    updatedAt: "1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
  };
  // Order summary requires totalPrice as required field
  const emptyOrderSummary: IShoppingMallOrder.ISummary = {
    id: "",
    orderNumber: "",
    totalPrice: 0,
    totalQuantity: 0,
    orderStatus: "paid",
    createdAt: "1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
    updatedAt: "1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
    deletedAt: null,
    customer: emptyCustomerSummary,
  };
  // Product variant summary
  const emptyProductVariantSummary: IShoppingMallProductVariant.ISummary = {
    id: "",
    skuCode: "",
    priceOverride: null,
    stockQuantity: 0,
    createdAt: "1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
    updatedAt: "1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
    deletedAt: null,
  };
  // Order item summary - removed invalid totalPrice field
  const emptyOrderItemSummary: IShoppingMallOrderItem.ISummary = {
    id: "",
    quantity: 0,
    status: "paid",
    createdAt: "1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
    updatedAt: "1970-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
    deletedAt: null,
    order: emptyOrderSummary,
    productVariant: emptyProductVariantSummary,
  };
  // Map results to DTO with safe date conversion
  const resultData: IShoppingMallReviewSnapshot.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      review: {
        id: record.shopping_mall_product_review_id,
        rating: record.rating,
        createdAt: toISOStringSafe(record.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(record.updated_at) as string &
          tags.Format<"date-time">,
        customer: emptyCustomerSummary,
        deletedAt: record.deleted_at
          ? (toISOStringSafe(record.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
        orderItem: emptyOrderItemSummary,
        productVariant: emptyProductVariantSummary,
      } satisfies IShoppingMallProductReview.ISummary,
      rating: record.rating,
      body: record.body ?? null,
      snapshotCreatedAt: toISOStringSafe(record.snapshot_created_at) as string &
        tags.Format<"date-time">,
      createdAt: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: record.deleted_at
        ? (toISOStringSafe(record.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    }),
  );
  // Return paginated result
  return {
    data: resultData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
