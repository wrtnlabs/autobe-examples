import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductSnapshotImageTransformer } from "../transformers/MallPlatformProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerProductSnapshotsProductSnapshotIdImages(props: {
  seller: SellerPayload;
  productSnapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductSnapshotImage[]> {
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_snapshots.findUniqueOrThrow({
      where: { id: props.productSnapshotId },
      select: {
        id: true,
        product: {
          select: {
            seller_account_id: true,
          },
        },
      },
    });
  if (snapshot.product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const records =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.findMany({
      where: { mall_platform_product_snapshot_id: props.productSnapshotId },
      orderBy: { sort_order: "asc" },
      ...MallPlatformProductSnapshotImageTransformer.select(),
    });
  return await ArrayUtil.asyncMap(
    records,
    MallPlatformProductSnapshotImageTransformer.transform,
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
// import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
// import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformSellerProductSnapshotsProductSnapshotIdImages(props: {
//   seller: SellerPayload;
//   productSnapshotId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformProductSnapshotImage> {
//   const record = await MyGlobal.prisma.mall_platform_product_snapshot_images.findFirstOrThrow({
//     ...MallPlatformProductSnapshotImageTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformProductSnapshotImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------