import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
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
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";
import { MallPlatformProductVariantAtSummaryTransformer } from "./MallPlatformProductVariantAtSummaryTransformer";

export namespace MallPlatformProductVariantSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.mall_platform_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
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
        snapshotOptions: { select: { id: true } },
        productSnapshotVariants: { select: { id: true } },
      },
    } satisfies Prisma.mall_platform_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProductVariantSnapshot.ISummary> {
    return {
      id: input.id,
      productVariant:
        await MallPlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      sku_code: input.sku_code,
      option_summary: input.option_summary,
      price_override: input.price_override,
      snapshot_reason: input.snapshot_reason,
      created_at: input.created_at.toISOString(),
    } satisfies IMallPlatformProductVariantSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductVariantSnapshotAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IMallPlatformProductVariantSnapshot.ISummary> {
//         return {
//   id: {string},
//   productVariant: await MallPlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   sku_code: {string},
//   option_summary: {string},
//   price_override: {number | null},
//   snapshot_reason: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------