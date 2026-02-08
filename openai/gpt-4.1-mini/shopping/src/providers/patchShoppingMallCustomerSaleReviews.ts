import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
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

export async function patchShoppingMallCustomerSaleReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleReview.IRequest;
}): Promise<IPageIShoppingMallSaleReview.ISummary> {
  const body = props.body as unknown as {
    page?: number | null;
    limit?: number | null;
    sale_id?: string | null;
    customer_id?: string | null;
    rating?: number | null;
    body_search?: string | null;
    cursor?: string | null;
  };
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page number must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const where: Prisma.shopping_mall_sale_reviewsWhereInput = {
    deleted_at: null,
  };
  if (body.sale_id) {
    where.shopping_mall_sale_id = body.sale_id;
  }
  if (body.customer_id) {
    where.shopping_mall_customer_id = body.customer_id;
  }
  if (typeof body.rating === "number") {
    where.rating = body.rating;
  }
  if (body.body_search) {
    where.body = {
      contains: body.body_search,
      mode: "insensitive",
    };
  }
  const cursor = body.cursor ? { id: body.cursor } : undefined;
  const skip = body.cursor ? 1 : 0;
  const records = await MyGlobal.prisma.shopping_mall_sale_reviews.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: limit,
    skip,
    cursor,
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_reviews.count({
    where,
  });
  const data: IPageIShoppingMallSaleReview.ISummary["data"] = records.map(
    (record) => {
      return {
        id: record.id,
        sale_id: record.shopping_mall_sale_id,
        customer_id: record.shopping_mall_customer_id,
        rating: record.rating,
        body: record.body === null ? undefined : record.body,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
      };
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
