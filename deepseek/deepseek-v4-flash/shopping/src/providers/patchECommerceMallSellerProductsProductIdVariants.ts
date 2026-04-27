import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallProductVariantAtSummaryTransformer } from "../transformers/ECommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IECommerceMallProductVariant.IRequest;
}): Promise<IPageIECommerceMallProductVariant.ISummary> {
  // Verify product exists and belongs to the requesting seller
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true, base_price: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build Prisma WHERE clause for active variants of this product
  const where: Prisma.e_commerce_mall_product_variantsWhereInput = {
    e_commerce_mall_product_id: props.productId,
    deleted_at: null,
  };
  if (props.body.search !== undefined && props.body.search !== "") {
    where.sku_code = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Fetch all matching variants using transformer's select()
  const allVariants =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findMany({
      where,
      ...ECommerceMallProductVariantAtSummaryTransformer.select(),
    });
  // Enrich with computed fields: stock (SUM of inventory records) and effective_price (COALESCE)
  const enriched = allVariants.map((record) => ({
    record,
    stock: record.inventoryRecords.reduce(
      (sum, r) => sum + r.quantity_change,
      0,
    ),
    effective_price: record.price ?? product.base_price,
  }));
  // Apply stock_status filter (in-memory since stock is computed)
  let filtered = enriched;
  if (props.body.stock_status === "in_stock") {
    filtered = enriched.filter((e) => e.stock > 0);
  } else if (props.body.stock_status === "out_of_stock") {
    filtered = enriched.filter((e) => e.stock === 0);
  }
  // Apply sorting (created_at via ISO string comparison, or effective_price)
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  filtered.sort((a, b) => {
    if (sortField === "price") {
      const cmp = a.effective_price - b.effective_price;
      return direction === "asc" ? cmp : -cmp;
    }
    // Compare created_at as ISO 8601 strings (lexicographic order matches chronological)
    const cmp = a.record.created_at
      .toISOString()
      .localeCompare(b.record.created_at.toISOString());
    return direction === "asc" ? cmp : -cmp;
  });
  const total = filtered.length;
  const pages = Math.ceil(total / limit);
  const paginated = filtered.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(paginated, (e) =>
      ECommerceMallProductVariantAtSummaryTransformer.transform(e.record),
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IPageIECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSellerProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IECommerceMallProductVariant.IRequest;
// }): Promise<IPageIECommerceMallProductVariant.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_product_variants.findMany({
//     ...ECommerceMallProductVariantAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallProductVariantAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------