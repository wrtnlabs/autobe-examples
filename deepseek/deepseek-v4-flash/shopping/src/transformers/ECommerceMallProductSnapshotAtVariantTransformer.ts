import { IECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ECommerceMallProductSnapshotAtVariantTransformer {
  export type Payload =
    Prisma.e_commerce_mall_product_snapshot_variantsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        created_at: true,
      },
    } satisfies Prisma.e_commerce_mall_product_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallProductSnapshot.IVariant> {
    return {
      id: input.id,
      sku: input.sku,
      name: input.name,
      price: input.price ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallProductSnapshot.IVariant;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallProductSnapshotAtVariantTransformer {
//       export type Payload = Prisma.e_commerce_mall_product_snapshot_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku: true,
//             name: true,
//             price: true,
//             created_at: true,
//             e_commerce_mall_product_snapshot_id: true,
//           },
//         } satisfies Prisma.e_commerce_mall_product_snapshot_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallProductSnapshot.IVariant> {
//         return {
//   id: {string},
//   sku: {string},
//   name: {string},
//   price: {number | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------