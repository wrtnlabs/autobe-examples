import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function getMallPlatformSellerProductsProductIdSnapshotsSnapshotIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformProductSnapshotImage> {
  await MyGlobal.prisma.mall_platform_products.findFirstOrThrow({
    where: {
      id: props.productId,
      seller_account_id: props.seller.id,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.mall_platform_product_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      mall_platform_product_id: props.productId,
    },
    select: {
      id: true,
    },
  });
  const record =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.findFirstOrThrow(
      {
        where: {
          mall_platform_product_snapshot_id: props.snapshotId,
        },
        orderBy: {
          sort_order: "asc",
        },
        ...MallPlatformProductSnapshotImageTransformer.select(),
      },
    );
  return await MallPlatformProductSnapshotImageTransformer.transform(record);
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformSellerProductsProductIdSnapshotsSnapshotIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformProductSnapshotImage> {
//   const record = await MyGlobal.prisma.mall_platform_product_snapshot_images.findFirstOrThrow({
//     ...MallPlatformProductSnapshotImageTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformProductSnapshotImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------