import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductSnapshotTransformer } from "../transformers/EcommerceMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string;
  snapshotId: string;
}): Promise<IEcommerceMallProductSnapshot> {
  // Verify product ownership
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      select: { ecommerce_mall_seller_id: true },
      where: { id: props.productId },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the snapshot
  const record =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findFirstOrThrow({
      ...EcommerceMallProductSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        ecommerce_mall_product_id: props.productId,
      },
    });
  return await EcommerceMallProductSnapshotTransformer.transform(record);
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
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerProductsProductIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   productId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallProductSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_snapshots.findFirstOrThrow({
//     ...EcommerceMallProductSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------