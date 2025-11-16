import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReviews(props: {
  admin: AdminPayload;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const {
    reviewId,
    shopping_mall_product_id,
    shopping_mall_product_sku_id,
    shopping_mall_customer_id,
    shopping_mall_order_id,
    shopping_mall_order_item_id,
    moderation_status,
    is_draft,
    withdrawn,
    keyword,
    min_rating,
    max_rating,
    created_after,
    created_before,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body;

  const where: any = {};
  if (reviewId) where.id = reviewId;
  if (shopping_mall_product_id)
    where.shopping_mall_product_id = shopping_mall_product_id;
  if (shopping_mall_product_sku_id)
    where.shopping_mall_product_sku_id = shopping_mall_product_sku_id;
  if (shopping_mall_customer_id)
    where.shopping_mall_customer_id = shopping_mall_customer_id;
  if (shopping_mall_order_id)
    where.shopping_mall_order_id = shopping_mall_order_id;
  if (shopping_mall_order_item_id)
    where.shopping_mall_order_item_id = shopping_mall_order_item_id;
  if (moderation_status) where.moderation_status = moderation_status;
  if (typeof is_draft === "boolean") where.is_draft = is_draft;
  if (typeof withdrawn === "boolean")
    where.withdrawn_at = withdrawn ? { not: null } : null;
  if (created_after || created_before) {
    where.created_at = {};
    if (created_after) where.created_at.gte = created_after;
    if (created_before) where.created_at.lte = created_before;
  }
  if (keyword) {
    where.OR = [
      { title: { contains: keyword, mode: "insensitive" } },
      { body: { contains: keyword, mode: "insensitive" } },
    ];
  }
  // Rating filters not applied here due to relation depth limitations in Prisma

  const skip = (page - 1) * limit;
  const take = limit;
  const orderBy = [{ [sort_by]: sort_order }];

  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.count({ where }),
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        customer: true,
        product: { include: { seller: true } },
        productSku: true,
        productRating: {
          include: {
            customer: true,
            product: { include: { seller: true } },
            productSku: true,
          },
        },
        orderItem: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r: any) => ({
      id: r.id,
      title: r.title,
      is_draft: r.is_draft,
      moderation_status: r.moderation_status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      customer: {
        id: r.customer.id,
        name: r.customer.name,
      },
      product: {
        id: r.product.id,
        title: r.product.title,
        default_price: r.product.default_price,
        business_status: r.product.business_status,
        seller: {
          id: r.product.seller.id,
          business_name: r.product.seller.business_name,
        },
        categories: [],
        created_at: toISOStringSafe(r.product.created_at),
      },
      productSku: {
        id: r.productSku.id,
        code: r.productSku.sku_code,
        product_title: r.product.title,
        option_summary: r.productSku.sku_code,
        in_stock:
          (r.productSku.stock ?? 0) > 0 &&
          r.productSku.status === "active" &&
          r.productSku.deleted_at === null,
      },
      productRating: r.productRating
        ? {
            id: r.productRating.id,
            value: r.productRating.value,
            created_at: toISOStringSafe(r.productRating.created_at),
            updated_at: toISOStringSafe(r.productRating.updated_at),
            deleted_at:
              r.productRating.deleted_at !== null &&
              r.productRating.deleted_at !== undefined
                ? toISOStringSafe(r.productRating.deleted_at)
                : null,
            customer: {
              id: r.productRating.customer.id,
              name: r.productRating.customer.name,
            },
            product: {
              id: r.productRating.product.id,
              title: r.productRating.product.title,
              default_price: r.productRating.product.default_price,
              business_status: r.productRating.product.business_status,
              seller: {
                id: r.productRating.product.seller.id,
                business_name: r.productRating.product.seller.business_name,
              },
              categories: [],
              created_at: toISOStringSafe(r.productRating.product.created_at),
            },
            productSku: {
              id: r.productRating.productSku.id,
              code: r.productRating.productSku.sku_code,
              product_title: r.productRating.product.title,
              option_summary: r.productRating.productSku.sku_code,
              in_stock:
                (r.productRating.productSku.stock ?? 0) > 0 &&
                r.productRating.productSku.status === "active" &&
                r.productRating.productSku.deleted_at === null,
            },
          }
        : {
            id: v4(),
            value: 1,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
            deleted_at: null,
            customer: { id: v4(), name: "" },
            product: {
              id: v4(),
              title: "",
              default_price: 0,
              business_status: "",
              seller: { id: v4(), business_name: "" },
              categories: [],
              created_at: toISOStringSafe(new Date()),
            },
            productSku: {
              id: v4(),
              code: "",
              product_title: "",
              option_summary: "",
              in_stock: false,
            },
          },
      orderItem: { id: r.shopping_mall_order_item_id },
    })),
  };
}
