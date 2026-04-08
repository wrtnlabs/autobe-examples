import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductVariantOptionAtSummaryTransformer } from "./EcommerceMallProductVariantOptionAtSummaryTransformer";

export namespace EcommerceMallProductVariantAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        updated_at: true,
        variantOptions:
          EcommerceMallProductVariantOptionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariant.ISummary> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      price: input.price ?? null,
      options: await ArrayUtil.asyncMap(
        input.variantOptions,
        EcommerceMallProductVariantOptionAtSummaryTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductVariantAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             product_id: true,
//             variantOptions: EcommerceMallProductVariantOptionAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProductVariant.ISummary> {
//         return {
//   id: {string},
//   skuCode: {string},
//   price: {number | null},
//   options: await ArrayUtil.asyncMap(input.variantOptions, EcommerceMallProductVariantOptionAtSummaryTransformer.transform),
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------