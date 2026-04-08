import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductSnapshotAtSummaryTransformer } from "./MallPlatformProductSnapshotAtSummaryTransformer";

export namespace MallPlatformProductSnapshotImageAtSummaryTransformer {
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
  ): Promise<IMallPlatformProductSnapshotImage.ISummary> {
    return {
      id: input.id,
      productSnapshot:
        await MallPlatformProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      imageUri: input.image_uri,
      sortOrder: input.sort_order,
      createdAt: input.created_at.toISOString(),
    } satisfies IMallPlatformProductSnapshotImage.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductSnapshotImageAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IMallPlatformProductSnapshotImage.ISummary> {
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