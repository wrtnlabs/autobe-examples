import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminProductsProductIdVariantsVariantCodeSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantCode: string;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantSnapshot> {
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        code: props.variantCode,
        shopping_mall_product_id: props.productId,
      },
      select: { id: true },
    });
  if (variant === null) {
    throw new HttpException(
      `Variant with code "${props.variantCode}" not found for product "${props.productId}"`,
      404,
    );
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          shopping_mall_product_variant_id: variant.id,
        },
        ...ShoppingMallProductVariantSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallProductVariantSnapshotTransformer.transform(
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
// import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminProductsProductIdVariantsVariantCodeSnapshotsSnapshotId(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
//   variantCode: string;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallProductVariantSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findFirstOrThrow({
//     ...ShoppingMallProductVariantSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallProductVariantSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------