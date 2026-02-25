import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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

export async function patchShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page === null || page < 1 || !Number.isInteger(page)) {
    throw new HttpException("page must be a positive integer", 400);
  }
  if (limit === null || limit < 1 || !Number.isInteger(limit)) {
    throw new HttpException("limit must be a positive integer", 400);
  }
  const toFormatDateTimeString = (
    date: Date | null | undefined,
  ): (string & tags.Format<"date-time">) | null => {
    if (date === null || date === undefined) return null;
    return toISOStringSafe(date);
  };
  const where: Prisma.shopping_mall_reviewsWhereInput = {
    ...(props.body.customerId ? { customer_id: props.body.customerId } : {}),
    ...(props.body.orderId ? { order_id: props.body.orderId } : {}),
    ...(props.body.orderItemId
      ? { order_item_id: props.body.orderItemId }
      : {}),
    ...(props.body.ratingMin !== undefined
      ? { rating: { gte: props.body.ratingMin } }
      : {}),
    ...(props.body.ratingMax !== undefined
      ? { rating: { lte: props.body.ratingMax } }
      : {}),
    ...(props.body.createdAtFrom
      ? { created_at: { gte: new Date(props.body.createdAtFrom) } }
      : {}),
    ...(props.body.createdAtTo
      ? { created_at: { lte: new Date(props.body.createdAtTo) } }
      : {}),
    ...(props.body.updatedAtFrom
      ? { updated_at: { gte: new Date(props.body.updatedAtFrom) } }
      : {}),
    ...(props.body.updatedAtTo
      ? { updated_at: { lte: new Date(props.body.updatedAtTo) } }
      : {}),
    deleted_at: props.body.includeDeleted ? undefined : null,
  };
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
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
  });
  const rows = data.map((r) => {
    return {
      id: r.id,
      rating: r.rating,
      body: r.body === undefined ? null : r.body,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: toFormatDateTimeString(r.deleted_at),
      customer: {
        id: r.customer.id,
        email: r.customer.email,
        displayName:
          r.customer.display_name === undefined
            ? null
            : r.customer.display_name,
        phoneNumber:
          r.customer.phone_number === undefined
            ? null
            : r.customer.phone_number,
        createdAt: toISOStringSafe(r.customer.created_at),
        updatedAt: toISOStringSafe(r.customer.updated_at),
      },
      orderItem: {
        id: r.orderItem.id,
        quantity: r.orderItem.quantity,
        status: typia.assert<
          "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
        >(r.orderItem.status),
        createdAt: toISOStringSafe(r.orderItem.created_at),
        updatedAt: toISOStringSafe(r.orderItem.updated_at),
        deletedAt: toFormatDateTimeString(r.orderItem.deleted_at),
        order: {
          id: r.orderItem.order.id,
          orderNumber: r.orderItem.order.order_number,
          totalPrice: r.orderItem.order.total_price,
          totalQuantity: r.orderItem.order.total_quantity,
          orderStatus: r.orderItem.order.order_status,
          createdAt: toISOStringSafe(r.orderItem.order.created_at),
          updatedAt: toISOStringSafe(r.orderItem.order.updated_at),
          deletedAt: toFormatDateTimeString(r.orderItem.order.deleted_at),
          customer: {
            id: r.orderItem.order.customer.id,
            email: r.orderItem.order.customer.email,
            displayName:
              r.orderItem.order.customer.display_name === undefined
                ? null
                : r.orderItem.order.customer.display_name,
            phoneNumber:
              r.orderItem.order.customer.phone_number === undefined
                ? null
                : r.orderItem.order.customer.phone_number,
            createdAt: toISOStringSafe(r.orderItem.order.customer.created_at),
            updatedAt: toISOStringSafe(r.orderItem.order.customer.updated_at),
          },
        },
        productVariant: {
          id: r.orderItem.productVariant.id,
          skuCode: r.orderItem.productVariant.sku_code,
          priceOverride:
            r.orderItem.productVariant.price_override === undefined
              ? null
              : r.orderItem.productVariant.price_override,
          stockQuantity: r.orderItem.productVariant.stock_quantity,
          createdAt: toISOStringSafe(r.orderItem.productVariant.created_at),
          updatedAt: toISOStringSafe(r.orderItem.productVariant.updated_at),
          deletedAt: toFormatDateTimeString(
            r.orderItem.productVariant.deleted_at,
          ),
        },
      },
    };
  });
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({ where });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: rows,
  };
}
