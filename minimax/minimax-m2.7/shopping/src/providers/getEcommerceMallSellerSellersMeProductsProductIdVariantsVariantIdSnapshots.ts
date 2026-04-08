import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductSnapshotVariantTransformer } from "../transformers/EcommerceMallProductSnapshotVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellersMeProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceMallProductSnapshotVariant> {
  // Step 1: Verify variant exists and get product ownership info
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        sku_code: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            ecommerce_mall_seller_id: true,
            deleted_at: true,
          },
        },
      },
    });
  // Step 2: Verify productId matches the variant's product
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to this product", 400);
  }
  // Step 3: Verify product belongs to authenticated seller (ownership check)
  if (variant.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Pagination setup
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Step 5: Query variant snapshots for this variant, ordered by created_at descending
  const variantSnapshots =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_variants.findMany({
      where: {
        productSnapshot: {
          ecommerce_mall_product_id: props.productId,
          product: {
            ecommerce_mall_seller_id: props.seller.id,
          },
        },
        sku: variant.sku_code,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        sku: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        optionValues: EcommerceMallProductSnapshotVariantTransformer.select(),
      },
    });
  // Step 6: Count total records for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_variants.count({
      where: {
        productSnapshot: {
          ecommerce_mall_product_id: props.productId,
          product: {
            ecommerce_mall_seller_id: props.seller.id,
          },
        },
        sku: variant.sku_code,
      },
    });
  // Step 7: Transform variant snapshots to response DTOs
  const data: IEcommerceMallProductSnapshotVariant[] = await ArrayUtil.asyncMap(
    variantSnapshots,
    async (snapshot): Promise<IEcommerceMallProductSnapshotVariant> => {
      const optionValues = await ArrayUtil.asyncMap(
        snapshot.optionValues,
        EcommerceMallProductSnapshotVariantTransformer.transform,
      );
      return typia.assert<IEcommerceMallProductSnapshotVariant>({
        id: typia.assert(snapshot.id),
        price_override: snapshot.price_override,
        stock_quantity: snapshot.stock_quantity,
        created_at: toISOStringSafe(snapshot.created_at),
        optionValues: optionValues,
      });
    },
  );
  // Step 8: Return paginated response
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    data,
    pagination,
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
// import { IPageIEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerSellersMeProductsProductIdVariantsVariantIdSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
// }): Promise<IPageIEcommerceMallProductSnapshotVariant> {
//   const records = await MyGlobal.prisma.ecommerce_mall_product_snapshot_variant_option_values.findMany({
//     ...EcommerceMallProductSnapshotVariantTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductSnapshotVariantTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------