import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductVariantsVariantIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  variantId: string;
  snapshotId: string;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  // Query the snapshot with full selection including option values
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUnique({
      where: { id: props.snapshotId },
      ...EcommerceMallProductVariantSnapshotTransformer.select(),
    });
  // Handle not found
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  // Verify variantId matches (prevent information leakage)
  if (snapshot.product_variant_id !== props.variantId) {
    throw new HttpException("Snapshot not found", 404);
  }
  // For seller role, verify ownership by checking the variant belongs to this seller
  // Need to join through: product_variant -> product -> seller
  const variantWithProduct =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: snapshot.product_variant_id },
      select: {
        id: true,
        product: {
          select: {
            id: true,
            ecommerce_mall_seller_id: true,
          },
        },
      },
    });
  if (variantWithProduct === null) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify seller ownership
  if (variantWithProduct.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform to DTO
  return await EcommerceMallProductVariantSnapshotTransformer.transform(
    snapshot,
  );
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
// import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
// import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerProductVariantsVariantIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   variantId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallProductVariantSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findFirstOrThrow({
//     ...EcommerceMallProductVariantSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------