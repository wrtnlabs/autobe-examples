import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductSnapshotAtSummaryTransformer } from "./MallPlatformProductSnapshotAtSummaryTransformer";
import { MallPlatformProductVariantSnapshotAtSummaryTransformer } from "./MallPlatformProductVariantSnapshotAtSummaryTransformer";

export namespace MallPlatformProductSnapshotVariantAtSummaryTransformer {
  export type Payload =
    Prisma.mall_platform_product_snapshot_variantsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        is_available: true,
        created_at: true,
        productSnapshot:
          MallPlatformProductSnapshotAtSummaryTransformer.select(),
        productVariantSnapshot:
          MallPlatformProductVariantSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_product_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductSnapshotVariant.ISummary> {
    return {
      id: input.id,
      productSnapshot:
        await MallPlatformProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      productVariantSnapshot: input.productVariantSnapshot
        ? await MallPlatformProductVariantSnapshotAtSummaryTransformer.transform(
            input.productVariantSnapshot,
          )
        : null,
      skuCode: input.sku_code,
      optionValues: input.option_values,
      priceOverride:
        input.price_override === null ? null : Number(input.price_override),
      isAvailable: input.is_available,
      createdAt: input.created_at.toISOString(),
    } satisfies IMallPlatformProductSnapshotVariant.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductSnapshotVariantAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_product_snapshot_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             option_values: true,
//             price_override: true,
//             is_available: true,
//             created_at: true,
//             productSnapshot: MallPlatformProductSnapshotAtSummaryTransformer.select(),
//             productVariantSnapshot: MallPlatformProductVariantSnapshotAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_product_snapshot_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProductSnapshotVariant.ISummary> {
//         return {
//   id: {string},
//   productSnapshot: await MallPlatformProductSnapshotAtSummaryTransformer.transform(input.productSnapshot),
//   productVariantSnapshot: input.productVariantSnapshot ? await MallPlatformProductVariantSnapshotAtSummaryTransformer.transform(input.productVariantSnapshot) : null,
//   skuCode: {string},
//   optionValues: {string},
//   priceOverride: {number | null},
//   isAvailable: {boolean},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------