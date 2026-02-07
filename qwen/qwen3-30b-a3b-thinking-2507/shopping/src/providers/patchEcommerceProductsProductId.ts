import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductReviewAtSummaryTransformer } from "../transformers/EcommerceProductReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductId(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductReview.IRequest;
}): Promise<IPageIEcommerceProductReview.ISummary> {
  // Check if product exists
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) throw new HttpException("Product not found", 404);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.ecommerce_product_reviews.findMany({
    where: { product_id: props.productId, deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    ...EcommerceProductReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_product_reviews.count({
    where: { product_id: props.productId, deleted_at: null },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceProductReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
