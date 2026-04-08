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
import { EcommerceMallProductSnapshotImageTransformer } from "../transformers/EcommerceMallProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductSnapshotsSnapshotIdImagesImageId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductSnapshotImage> {
  // Verify snapshot exists and get product ownership information for authorization
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        product: {
          select: {
            ecommerce_mall_seller_id: true,
          },
        },
      },
    });
  // Verify the seller owns the product
  if (snapshot.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the specific image by composite key (snapshot_id, image_id)
  const record =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findFirstOrThrow(
      {
        ...EcommerceMallProductSnapshotImageTransformer.select(),
        where: {
          id: props.imageId,
          ecommerce_mall_product_snapshot_id: props.snapshotId,
        },
      },
    );
  return await EcommerceMallProductSnapshotImageTransformer.transform(record);
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
// import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerProductSnapshotsSnapshotIdImagesImageId(props: {
//   seller: SellerPayload;
//   snapshotId: string;
//   imageId: string;
// }): Promise<IEcommerceMallProductSnapshotImage> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_snapshot_images.findFirstOrThrow({
//     ...EcommerceMallProductSnapshotImageTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductSnapshotImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------