import { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductSnapshotVariantOptionValueTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_snapshot_variant_option_valuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        productSnapshotVariant: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_product_snapshot_variant_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductSnapshotVariantOptionValue> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      createdAt: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductSnapshotVariantOptionValueTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_snapshot_variant_option_valuesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             key: true,
//             value: true,
//             created_at: true,
//             ecommerce_mall_product_snapshot_variant_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_product_snapshot_variant_option_valuesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductSnapshotVariantOptionValue> {
//         return {
//   id: {string},
//   key: {string},
//   value: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------