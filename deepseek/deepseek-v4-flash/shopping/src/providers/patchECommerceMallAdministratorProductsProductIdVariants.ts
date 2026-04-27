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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallProductVariantAtSummaryTransformer } from "../transformers/ECommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorProductsProductIdVariants(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IECommerceMallProductVariant.IRequest;
}): Promise<IPageIECommerceMallProductVariant.ISummary> {
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const whereInput = {
    e_commerce_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.search
      ? {
          sku_code: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  } satisfies Prisma.e_commerce_mall_product_variantsWhereInput;
  const records =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findMany({
      where: whereInput,
      ...ECommerceMallProductVariantAtSummaryTransformer.select(),
    });
  let variants = await ArrayUtil.asyncMap(
    records,
    ECommerceMallProductVariantAtSummaryTransformer.transform,
  );
  if (props.body.stock_status === "in_stock") {
    variants = variants.filter((v) => v.stock > 0);
  } else if (props.body.stock_status === "out_of_stock") {
    variants = variants.filter((v) => v.stock === 0);
  }
  const sort = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  if (sort === "created_at") {
    variants.sort((a, b) => {
      const cmp = a.created_at.localeCompare(b.created_at);
      return direction === "asc" ? cmp : -cmp;
    });
  } else if (sort === "price") {
    variants.sort((a, b) => {
      const cmp = a.effective_price - b.effective_price;
      return direction === "asc" ? cmp : -cmp;
    });
  }
  const total = variants.length;
  const skip = (page - 1) * limit;
  const data = variants.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
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
// export async function patchECommerceMallAdministratorProductsProductIdVariants(props: {
//   administrator: AdministratorPayload;
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