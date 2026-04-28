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
import { EcommercePlatformSnapshotVariantAtSummaryTransformer } from "./EcommercePlatformSnapshotVariantAtSummaryTransformer";

export namespace EcommercePlatformSnapshotAtInvertTransformer {
  export type Payload = Prisma.ecommerce_platform_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_type: true,
        created_at: true,
        variantSnapshot:
          EcommercePlatformSnapshotVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshot.IInvert> {
    const snapshotVariant =
      await EcommercePlatformSnapshotVariantAtSummaryTransformer.transform(
        input.variantSnapshot!,
      );
    return {
      id: input.id,
      entity_type: input.entity_type,
      created_at: toISOStringSafe(input.created_at),
      snapshot_variant: snapshotVariant,
      product_variant: snapshotVariant.variant,
    } satisfies IEcommercePlatformSnapshot.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             entity_type: true,
//             created_at: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_platform_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshot.IInvert> {
//         return {
//   id: {string},
//   entity_type: {string},
//   created_at: {string},
//   snapshot_variant: {IEcommercePlatformSnapshotVariant.ISummary},
//   product_variant: {IEcommercePlatformProductVariant.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------