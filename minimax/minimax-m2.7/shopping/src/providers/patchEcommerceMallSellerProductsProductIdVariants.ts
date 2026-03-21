import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  // Step 1: Verify product exists and belongs to seller (ownership check)
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Pagination parameters
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  // Step 3: Build base where clause
  const whereInput: Prisma.ecommerce_mall_product_variantsWhereInput = {
    ecommerce_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.inStock === true && { quantity: { gt: 0 } }),
  };
  // Step 4: Apply cursor-based pagination if cursor is provided
  // Cursor is base64-encoded timestamp
  if (props.body.cursor) {
    const decodedCursor = Buffer.from(props.body.cursor, "base64").toString(
      "utf-8",
    );
    const cursorDate = new Date(decodedCursor);
    whereInput.created_at = { lt: cursorDate };
  }
  // Step 5: Order by created_at descending
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput;
  // Step 6: Query variants with option values using transformer select
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: whereInput,
      orderBy: orderByInput,
      take: limit,
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    });
  // Step 7: Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_product_variants.count({
    where: whereInput,
  });
  // Step 8: Transform results using transformer
  const data = await ArrayUtil.asyncMap(
    variants,
    EcommerceMallProductVariantAtSummaryTransformer.transform,
  );
  // Step 9: Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallProductVariant.ISummary;
}
