import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductVariantAtSummaryTransformer } from "../transformers/EcommerceProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariant.IRequest;
}): Promise<IPageIEcommerceProductVariant.ISummary> {
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.ecommerce_products.findFirstOrThrow({
    where: { id: props.productId, deleted_at: null },
  });
  // Apply filters
  const whereInput = {
    ecommerce_product_id: props.productId,
    deleted_at: null,
    ...(props.body.search && { sku_code: { contains: props.body.search } }),
    ...(props.body.price_min !== undefined && {
      price: { gte: props.body.price_min },
    }),
    ...(props.body.price_max !== undefined && {
      price: { lte: props.body.price_max },
    }),
  } satisfies Prisma.ecommerce_product_variantsWhereInput;
  // Get items with transformer and pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 12;
  const skip = (page - 1) * limit;
  const variants = await MyGlobal.prisma.ecommerce_product_variants.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { sku_code: "asc" },
    ...EcommerceProductVariantAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_product_variants.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      variants,
      EcommerceProductVariantAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceProductVariant.ISummary;
}
