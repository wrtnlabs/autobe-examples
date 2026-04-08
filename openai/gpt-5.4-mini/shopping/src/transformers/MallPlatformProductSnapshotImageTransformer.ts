import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductSnapshotAtSummaryTransformer } from "./MallPlatformProductSnapshotAtSummaryTransformer";

export namespace MallPlatformProductSnapshotImageTransformer {
  export type Payload = Prisma.mall_platform_product_snapshot_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_uri: true,
        sort_order: true,
        created_at: true,
        productSnapshot:
          MallPlatformProductSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_product_snapshot_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductSnapshotImage> {
    return {
      id: input.id,
      productSnapshot:
        await MallPlatformProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      imageUri: input.image_uri,
      sortOrder: input.sort_order,
      createdAt: input.created_at.toISOString(),
    } satisfies IMallPlatformProductSnapshotImage;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductSnapshotImageTransformer {
//       export type Payload = Prisma.mall_platform_product_snapshot_imagesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             image_uri: true,
//             sort_order: true,
//             created_at: true,
//             productSnapshot: MallPlatformProductSnapshotAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_product_snapshot_imagesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProductSnapshotImage> {
//         return {
//   id: {string},
//   productSnapshot: await MallPlatformProductSnapshotAtSummaryTransformer.transform(input.productSnapshot),
//   imageUri: {string},
//   sortOrder: {integer},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------