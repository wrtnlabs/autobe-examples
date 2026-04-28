import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformProductVariantAtSummaryTransformer } from "./EcommercePlatformProductVariantAtSummaryTransformer";
import { EcommercePlatformSnapshotAtSummaryTransformer } from "./EcommercePlatformSnapshotAtSummaryTransformer";

export namespace EcommercePlatformSnapshotVariantAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_platform_snapshot_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        stock_quantity: true,
        created_at: true,
        snapshot: EcommercePlatformSnapshotAtSummaryTransformer.select(),
        variant: EcommercePlatformProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotVariant.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price,
      stock_quantity: input.stock_quantity,
      snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(
        input.snapshot,
      ),
      variant:
        await EcommercePlatformProductVariantAtSummaryTransformer.transform(
          input.variant,
        ),
      created_at: input.created_at.toISOString(),
    } satisfies IEcommercePlatformSnapshotVariant.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotVariantAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshot_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             price: true,
//             stock_quantity: true,
//             created_at: true,
//             snapshot: EcommercePlatformSnapshotAtSummaryTransformer.select(),
//             variant: EcommercePlatformProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotVariant.ISummary> {
//         return {
//   id: {string},
//   sku_code: {string},
//   price: {number},
//   stock_quantity: {integer},
//   snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(input.snapshot),
//   variant: await EcommercePlatformProductVariantAtSummaryTransformer.transform(input.variant),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------