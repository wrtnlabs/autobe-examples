import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformSnapshotVariantAtSummaryTransformer } from "../transformers/EcommercePlatformSnapshotVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommercePlatformSnapshotVariant.IRequest;
}): Promise<IPageIEcommercePlatformSnapshotVariant.ISummary> {
  // Verify variant belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow(
      {
        where: { id: props.variantId },
        select: {
          ecommerce_platform_product_id: true,
        },
      },
    );
  if (variant.ecommerce_platform_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  // Verify seller owns the product
  const product =
    await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        sellerProfile: {
          select: {
            id: true,
          },
        },
      },
    });
  if (product.sellerProfile.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build WHERE clause from request filters
  const where = {
    ecommerce_platform_product_variant_id: props.variantId,
    ...(props.body.sku_code !== undefined && {
      sku_code: { contains: props.body.sku_code },
    }),
    ...(props.body.price !== undefined && { price: props.body.price }),
    ...(props.body.stock_quantity !== undefined && {
      stock_quantity: props.body.stock_quantity,
    }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: props.body.created_at_to,
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_platform_snapshot_variantsWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.ecommerce_platform_snapshot_variants.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformSnapshotVariantAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_snapshot_variants.count({
      where,
    });
  const pages = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommercePlatformSnapshotVariantAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommercePlatformSnapshotVariant.ISummary;
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
// import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
// import { IPageIEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformSellerProductsProductIdVariantsVariantIdSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformSnapshotVariant.IRequest;
// }): Promise<IPageIEcommercePlatformSnapshotVariant.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_snapshot_variants.findMany({
//     ...EcommercePlatformSnapshotVariantAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSnapshotVariantAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------