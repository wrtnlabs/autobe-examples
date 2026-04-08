import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductVariantSnapshotAtSummaryTransformer } from "./MallPlatformProductVariantSnapshotAtSummaryTransformer";

export namespace MallPlatformProductVariantSnapshotOptionAtSummaryTransformer {
  export type Payload =
    Prisma.mall_platform_product_variant_snapshot_optionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        option_key: true,
        option_value: true,
        productVariantSnapshot:
          MallPlatformProductVariantSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_product_variant_snapshot_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductVariantSnapshotOption.ISummary> {
    return {
      id: input.id,
      optionKey: input.option_key,
      optionValue: input.option_value,
      productVariantSnapshot:
        await MallPlatformProductVariantSnapshotAtSummaryTransformer.transform(
          input.productVariantSnapshot,
        ),
    } satisfies IMallPlatformProductVariantSnapshotOption.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductVariantSnapshotOptionAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_product_variant_snapshot_optionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             option_key: true,
//             option_value: true,
//             productVariantSnapshot: MallPlatformProductVariantSnapshotAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_product_variant_snapshot_optionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProductVariantSnapshotOption.ISummary> {
//         return {
//   id: {string},
//   optionKey: {string},
//   optionValue: {string},
//   productVariantSnapshot: await MallPlatformProductVariantSnapshotAtSummaryTransformer.transform(input.productVariantSnapshot),
//         };
//       }
//     }
//--------------------------------------------------------------