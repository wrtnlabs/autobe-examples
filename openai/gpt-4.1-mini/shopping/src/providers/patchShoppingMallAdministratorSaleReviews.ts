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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSaleReviews(props: {
  administrator: AdministratorPayload;
  body: Partial<{
    page?: number | null;
    limit?: number | null;
    sale_id?: string | null;
    customer_id?: string | null;
    star?: number | null;
    q?: string | null;
  }>;
}): Promise<IPageIShoppingMallSaleReview.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_reviewsWhereInput = {
    ...(props.body.sale_id
      ? { shopping_mall_sale_id: props.body.sale_id }
      : {}),
    ...(props.body.customer_id
      ? { shopping_mall_customer_id: props.body.customer_id }
      : {}),
    ...(props.body.star ? { rating: props.body.star } : {}),
    ...(props.body.q ? { body: { contains: props.body.q } } : {}),
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_reviews.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_reviews.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      sale_id: record.shopping_mall_sale_id,
      customer_id: record.shopping_mall_customer_id,
      star: record.rating,
      body: record.body === null ? undefined : record.body,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
