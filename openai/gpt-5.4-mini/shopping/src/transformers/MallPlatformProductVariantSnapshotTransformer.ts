import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";
import { MallPlatformProductVariantAtSummaryTransformer } from "./MallPlatformProductVariantAtSummaryTransformer";

export namespace MallPlatformProductVariantSnapshotTransformer {
  export type Payload =
    Prisma.mall_platform_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductVariantSnapshot> {
    return {
      id: input.id,
      productVariant:
        await MallPlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      skuCode: input.sku_code,
      optionSummary: input.option_summary,
      priceOverride:
        input.price_override === null ? null : Number(input.price_override),
      snapshotReason: input.snapshot_reason ?? null,
      createdAt: input.created_at.toISOString(),
    } satisfies IMallPlatformProductVariantSnapshot;
  }
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_summary: true,
        price_override: true,
        snapshot_reason: true,
        created_at: true,
        productVariant: MallPlatformProductVariantAtSummaryTransformer.select(),
        product: MallPlatformProductAtSummaryTransformer.select(),
        snapshotOptions: true,
        productSnapshotVariants: true,
      },
    } satisfies Prisma.mall_platform_product_variant_snapshotsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductVariantSnapshotTransformer {
//       export type Payload = Prisma.mall_platform_product_variant_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             option_summary: true,
//             price_override: true,
//             snapshot_reason: true,
//             created_at: true,
//             productVariant: MallPlatformProductVariantAtSummaryTransformer.select(),
//             product: MallPlatformProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_product_variant_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProductVariantSnapshot> {
//         return {
//   id: {string},
//   productVariant: await MallPlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   skuCode: {string},
//   optionSummary: {string},
//   priceOverride: {number | null},
//   snapshotReason: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------