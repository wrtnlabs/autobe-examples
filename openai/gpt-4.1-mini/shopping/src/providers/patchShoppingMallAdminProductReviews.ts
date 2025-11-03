import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminProductReviews(props: {
  admin: AdminPayload;
  body: IShoppingMallProductReview.IRequest;
}): Promise<IPageIShoppingMallProductReview.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereConditions: any = { deleted_at: null };

  if (
    body.shopping_mall_product_sku_id !== undefined &&
    body.shopping_mall_product_sku_id !== null
  ) {
    whereConditions.shopping_mall_product_sku_id =
      body.shopping_mall_product_sku_id;
  }
  if (
    body.shopping_mall_customer_id !== undefined &&
    body.shopping_mall_customer_id !== null
  ) {
    whereConditions.shopping_mall_customer_id = body.shopping_mall_customer_id;
  }
  if (
    body.shopping_mall_order_id !== undefined &&
    body.shopping_mall_order_id !== null
  ) {
    whereConditions.shopping_mall_order_id = body.shopping_mall_order_id;
  }
  if (body.rating !== undefined && body.rating !== null) {
    whereConditions.rating = body.rating;
  }
  if (body.moderation_status !== undefined && body.moderation_status !== null) {
    whereConditions.moderation_status = body.moderation_status;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_reviews.findMany({
      where: whereConditions,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            nickname: true,
            created_at: true,
          },
        },
        productSku: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            attributes_json: true,
            created_at: true,
            updated_at: true,
          },
        },
        order: {
          select: {
            id: true,
            order_code: true,
            status: true,
            payment_status: true,
            total_amount: true,
            shipping_address: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_reviews.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
      shopping_mall_customer_id: item.shopping_mall_customer_id,
      shopping_mall_order_id: item.shopping_mall_order_id,
      rating: item.rating,
      review_body: item.review_body ?? null,
      moderation_status: item.moderation_status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at !== null && item.deleted_at !== undefined
          ? toISOStringSafe(item.deleted_at)
          : null,
      customer: item.customer
        ? {
            id: item.customer.id,
            email: item.customer.email,
            nickname: item.customer.nickname,
            created_at: toISOStringSafe(item.customer.created_at),
          }
        : undefined,
      productSku: item.productSku
        ? {
            id: item.productSku.id,
            sku_code: item.productSku.sku_code,
            price: item.productSku.price,
            attributes_json: item.productSku.attributes_json ?? null,
            created_at: toISOStringSafe(item.productSku.created_at),
            updated_at: toISOStringSafe(item.productSku.updated_at),
          }
        : undefined,
      order: undefined,
    })),
  };
}
