import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerProductReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallProductReview.IRequest;
}): Promise<IPageIShoppingMallProductReview.ISummary> {
  const {
    shoppingMallCustomerId,
    shoppingMallProductVariantId,
    shoppingMallOrderItemId,
    ratingMin,
    ratingMax,
    includeDeleted = false,
    search,
    page: inputPage = 1,
    limit: inputLimit = 10,
  } = props.body;
  const page = Math.max(inputPage, 1);
  const limit = Math.min(Math.max(inputLimit, 1), 100);
  const skip = (page - 1) * limit;
  const whereBase: Prisma.shopping_mall_product_reviewsWhereInput = {};
  const andArray: Prisma.shopping_mall_product_reviewsWhereInput[] = [];
  if (shoppingMallCustomerId !== undefined) {
    andArray.push({ shopping_mall_customer_id: shoppingMallCustomerId });
  }
  if (shoppingMallProductVariantId !== undefined) {
    andArray.push({
      shopping_mall_product_variant_id: shoppingMallProductVariantId,
    });
  }
  if (shoppingMallOrderItemId !== undefined) {
    andArray.push({ shopping_mall_order_item_id: shoppingMallOrderItemId });
  }
  if (ratingMin !== undefined) {
    andArray.push({ rating: { gte: ratingMin } });
  }
  if (ratingMax !== undefined) {
    andArray.push({ rating: { lte: ratingMax } });
  }
  if (!includeDeleted) {
    andArray.push({ deleted_at: null });
  }
  if (search !== undefined && search.length > 0) {
    andArray.push({ body: { contains: search } });
  }
  if (andArray.length > 0) {
    whereBase.AND = andArray;
  }
  const total = await MyGlobal.prisma.shopping_mall_product_reviews.count({
    where: whereBase,
  });
  const dataRecords =
    await MyGlobal.prisma.shopping_mall_product_reviews.findMany({
      where: whereBase,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
    });
  const data = dataRecords.map((record) => ({
    id: record.id,
    rating: record.rating,
    body: record.body ?? null,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    customer: {
      id: record.customer.id,
      email: record.customer.email,
      displayName: record.customer.display_name ?? null,
      phoneNumber: record.customer.phone_number ?? null,
      createdAt: toISOStringSafe(record.customer.created_at),
      updatedAt: toISOStringSafe(record.customer.updated_at),
    },
    orderItem: {
      id: record.orderItem.id,
      quantity: record.orderItem.quantity,
      status: typia.assert<
        "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
      >(record.orderItem.status),
      createdAt: toISOStringSafe(record.orderItem.created_at),
      updatedAt: toISOStringSafe(record.orderItem.updated_at),
      deletedAt: record.orderItem.deleted_at
        ? toISOStringSafe(record.orderItem.deleted_at)
        : null,
      order: {
        id: record.orderItem.order.id,
        orderNumber: record.orderItem.order.order_number,
        totalPrice: record.orderItem.order.total_price,
        totalQuantity: record.orderItem.order.total_quantity,
        orderStatus: typia.assert<
          "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
        >(record.orderItem.order.order_status),
        createdAt: toISOStringSafe(record.orderItem.order.created_at),
        updatedAt: toISOStringSafe(record.orderItem.order.updated_at),
        deletedAt: record.orderItem.order.deleted_at
          ? toISOStringSafe(record.orderItem.order.deleted_at)
          : null,
        customer: {
          id: record.orderItem.order.customer.id,
          email: record.orderItem.order.customer.email,
          createdAt: toISOStringSafe(
            record.orderItem.order.customer.created_at,
          ),
          updatedAt: toISOStringSafe(
            record.orderItem.order.customer.updated_at,
          ),
        },
      },
      productVariant: {
        id: record.orderItem.productVariant.id,
        skuCode: record.orderItem.productVariant.sku_code,
        priceOverride: record.orderItem.productVariant.price_override ?? null,
        stockQuantity: record.orderItem.productVariant.stock_quantity,
        createdAt: toISOStringSafe(record.orderItem.productVariant.created_at),
        updatedAt: toISOStringSafe(record.orderItem.productVariant.updated_at),
        deletedAt: record.orderItem.productVariant.deleted_at
          ? toISOStringSafe(record.orderItem.productVariant.deleted_at)
          : null,
      },
    },
    productVariant: {
      id: record.productVariant.id,
      skuCode: record.productVariant.sku_code,
      priceOverride: record.productVariant.price_override ?? null,
      stockQuantity: record.productVariant.stock_quantity,
      createdAt: toISOStringSafe(record.productVariant.created_at),
      updatedAt: toISOStringSafe(record.productVariant.updated_at),
      deletedAt: record.productVariant.deleted_at
        ? toISOStringSafe(record.productVariant.deleted_at)
        : null,
    },
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
