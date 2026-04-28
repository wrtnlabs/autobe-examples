import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import { IEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformSnapshotVariantOptionTransformer } from "../transformers/EcommercePlatformSnapshotVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformAdminProductsProductIdVariantsVariantIdSnapshotsSnapshotIdOptionsOptionId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformSnapshotVariantOption> {
  // 1. Verify product exists
  await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // 2. Verify variant belongs to the product
  await MyGlobal.prisma.ecommerce_platform_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      ecommerce_platform_product_id: props.productId,
    },
  });
  // 3. Verify snapshot exists
  await MyGlobal.prisma.ecommerce_platform_snapshots.findUniqueOrThrow({
    where: { id: props.snapshotId },
  });
  // 4. Verify snapshot_variant record links snapshotId to variantId
  const snapshotVariant =
    await MyGlobal.prisma.ecommerce_platform_snapshot_variants.findFirstOrThrow(
      {
        where: {
          ecommerce_platform_snapshot_id: props.snapshotId,
          ecommerce_platform_product_variant_id: props.variantId,
        },
        select: { id: true },
      },
    );
  // 5. Retrieve the option record using the transformer's select
  const record =
    await MyGlobal.prisma.ecommerce_platform_snapshot_variant_options.findFirstOrThrow(
      {
        ...EcommercePlatformSnapshotVariantOptionTransformer.select(),
        where: {
          id: props.optionId,
          ecommerce_platform_snapshot_variant_id: snapshotVariant.id,
        },
      },
    );
  return await EcommercePlatformSnapshotVariantOptionTransformer.transform(
    record,
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
// import { IEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariantOption";
// import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformAdminProductsProductIdVariantsVariantIdSnapshotsSnapshotIdOptionsOptionId(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
//   optionId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformSnapshotVariantOption> {
//   const record = await MyGlobal.prisma.ecommerce_platform_snapshot_variant_options.findFirstOrThrow({
//     ...EcommercePlatformSnapshotVariantOptionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformSnapshotVariantOptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------