import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import { IShoppingMallProductSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotTransformer } from "../transformers/ShoppingMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
      ...ShoppingMallProductSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        shopping_mall_product_id: props.productId,
      },
    });
  if (record.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallProductSnapshotTransformer.transform(record);
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
// import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
// import { IShoppingMallProductSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallProductSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
//     ...ShoppingMallProductSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallProductSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------