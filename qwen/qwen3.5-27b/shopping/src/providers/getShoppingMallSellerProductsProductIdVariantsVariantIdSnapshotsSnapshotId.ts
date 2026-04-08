import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshot";
import { IShoppingMallVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallVariantSnapshotTransformer } from "../transformers/ShoppingMallVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallVariantSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_variant_snapshots.findFirstOrThrow({
      ...ShoppingMallVariantSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        shopping_mall_product_variant_id: props.variantId,
        productVariant: {
          shopping_mall_product_id: props.productId,
          product: {
            shopping_mall_seller_id: props.seller.id,
          },
        },
      },
    });
  return await ShoppingMallVariantSnapshotTransformer.transform(record);
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
// import { IShoppingMallVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshot";
// import { IShoppingMallVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshotOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallVariantSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_variant_snapshots.findFirstOrThrow({
//     ...ShoppingMallVariantSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallVariantSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------