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

export async function patchShoppingMallAdministratorReviewSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  const {
    id,
    shoppingMallProductReviewId,
    ratingMin,
    ratingMax,
    snapshotCreatedFrom,
    snapshotCreatedTo,
    createdFrom,
    createdTo,
    body: bodyFilter,
    page = 1,
    limit = 10,
  } = props.body;
  const where: Prisma.shopping_mall_review_snapshotsWhereInput = {};
  where.AND = [];
  if (id !== undefined) {
    where.AND.push({ id });
  }
  if (shoppingMallProductReviewId !== undefined) {
    where.AND.push({
      shopping_mall_product_review_id: shoppingMallProductReviewId,
    });
  }
  if (ratingMin !== undefined) {
    where.AND.push({ rating: { gte: ratingMin } });
  }
  if (ratingMax !== undefined) {
    where.AND.push({ rating: { lte: ratingMax } });
  }
  if (snapshotCreatedFrom !== undefined) {
    where.AND.push({ snapshot_created_at: { gte: snapshotCreatedFrom } });
  }
  if (snapshotCreatedTo !== undefined) {
    where.AND.push({ snapshot_created_at: { lte: snapshotCreatedTo } });
  }
  if (createdFrom !== undefined) {
    where.AND.push({ created_at: { gte: createdFrom } });
  }
  if (createdTo !== undefined) {
    where.AND.push({ created_at: { lte: createdTo } });
  }
  if (bodyFilter !== undefined) {
    where.AND.push({ body: { contains: bodyFilter, mode: "insensitive" } });
  }
  const pageNumber = page < 1 ? 1 : page;
  const pageLimit = limit < 1 ? 10 : limit > 100 ? 100 : limit;
  const skip = (pageNumber - 1) * pageLimit;
  const records = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany(
    {
      where,
      include: {
        review: {
          select: {
            id: true,
            rating: true,
            body: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                display_name: true,
                phone_number: true,
                created_at: true,
                updated_at: true,
              },
            },
            orderItem: {
              select: {
                id: true,
                quantity: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                order: {
                  select: {
                    id: true,
                    order_number: true,
                    total_price: true,
                    total_quantity: true,
                    order_status: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    customer: {
                      select: {
                        id: true,
                        email: true,
                        display_name: true,
                        phone_number: true,
                        created_at: true,
                        updated_at: true,
                      },
                    },
                  },
                },
                productVariant: {
                  select: {
                    id: true,
                    sku_code: true,
                    price_override: true,
                    stock_quantity: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
      },
      skip,
      take: pageLimit,
      orderBy: { snapshot_created_at: "desc" },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where,
  });
  const data: IShoppingMallReviewSnapshot.ISummary[] = records.map((record) => {
    const review = record.review!;
    const orderItem = review.orderItem!;
    const order = orderItem.order!;
    const orderCustomer = order.customer!;
    const productVariant = orderItem.productVariant!;
    const reviewCustomer = review.customer!;
    return {
      id: record.id,
      review: {
        id: review.id,
        rating: review.rating,
        body: review.body ?? null,
        createdAt: toISOStringSafe(review.created_at) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        updatedAt: toISOStringSafe(review.updated_at) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        deletedAt:
          review.deleted_at === null
            ? null
            : (toISOStringSafe(review.deleted_at) satisfies string &
                tags.Format<"date-time"> as string & tags.Format<"date-time">),
        customer: {
          id: reviewCustomer.id,
          email: reviewCustomer.email,
          displayName: reviewCustomer.display_name ?? null,
          phoneNumber: reviewCustomer.phone_number ?? null,
          createdAt: toISOStringSafe(
            reviewCustomer.created_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
          updatedAt: toISOStringSafe(
            reviewCustomer.updated_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
        },
        orderItem: {
          id: orderItem.id,
          quantity: orderItem.quantity,
          status: typia.assert<
            "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
          >(orderItem.status),
          createdAt: toISOStringSafe(orderItem.created_at) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          updatedAt: toISOStringSafe(orderItem.updated_at) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          deletedAt:
            orderItem.deleted_at === null
              ? null
              : (toISOStringSafe(orderItem.deleted_at) satisfies string &
                  tags.Format<"date-time"> as string &
                  tags.Format<"date-time">),
          order: {
            id: order.id,
            orderNumber: order.order_number,
            totalPrice: order.total_price,
            totalQuantity: order.total_quantity,
            orderStatus: order.order_status,
            createdAt: toISOStringSafe(order.created_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">,
            updatedAt: toISOStringSafe(order.updated_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">,
            deletedAt:
              order.deleted_at === null
                ? null
                : (toISOStringSafe(order.deleted_at) satisfies string &
                    tags.Format<"date-time"> as string &
                    tags.Format<"date-time">),
            customer: {
              id: orderCustomer.id,
              email: orderCustomer.email,
              displayName: orderCustomer.display_name ?? null,
              phoneNumber: orderCustomer.phone_number ?? null,
              createdAt: toISOStringSafe(
                orderCustomer.created_at,
              ) satisfies string & tags.Format<"date-time"> as string &
                tags.Format<"date-time">,
              updatedAt: toISOStringSafe(
                orderCustomer.updated_at,
              ) satisfies string & tags.Format<"date-time"> as string &
                tags.Format<"date-time">,
            },
          },
          productVariant: {
            id: productVariant.id,
            skuCode: productVariant.sku_code,
            priceOverride: productVariant.price_override ?? null,
            stockQuantity: productVariant.stock_quantity,
            createdAt: toISOStringSafe(
              productVariant.created_at,
            ) satisfies string & tags.Format<"date-time"> as string &
              tags.Format<"date-time">,
            updatedAt: toISOStringSafe(
              productVariant.updated_at,
            ) satisfies string & tags.Format<"date-time"> as string &
              tags.Format<"date-time">,
            deletedAt:
              productVariant.deleted_at === null
                ? null
                : (toISOStringSafe(productVariant.deleted_at) satisfies string &
                    tags.Format<"date-time"> as string &
                    tags.Format<"date-time">),
          },
        },
        productVariant: {
          id: productVariant.id,
          skuCode: productVariant.sku_code,
          priceOverride: productVariant.price_override ?? null,
          stockQuantity: productVariant.stock_quantity,
          createdAt: toISOStringSafe(
            productVariant.created_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
          updatedAt: toISOStringSafe(
            productVariant.updated_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
          deletedAt:
            productVariant.deleted_at === null
              ? null
              : (toISOStringSafe(productVariant.deleted_at) satisfies string &
                  tags.Format<"date-time"> as string &
                  tags.Format<"date-time">),
        },
      },
      rating: record.rating,
      body: record.body ?? null,
      snapshotCreatedAt: toISOStringSafe(
        record.snapshot_created_at,
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">,
      createdAt: toISOStringSafe(record.created_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.updated_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      deletedAt:
        record.deleted_at === null
          ? null
          : (toISOStringSafe(record.deleted_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">),
    };
  });
  return {
    pagination: {
      current: pageNumber,
      limit: pageLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / pageLimit),
    },
    data,
  };
}
