import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformProductVariantAtSummaryTransformer } from "./EcommercePlatformProductVariantAtSummaryTransformer";

export namespace EcommercePlatformProductVariantOptionTransformer {
  export type Payload =
    Prisma.ecommerce_platform_product_variant_optionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        attribute_key: true,
        attribute_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant:
          EcommercePlatformProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_product_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformProductVariantOption> {
    return {
      id: input.id,
      attributeKey: input.attribute_key,
      attributeValue: input.attribute_value,
      productVariant:
        await EcommercePlatformProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommercePlatformProductVariantOption;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformProductVariantOptionTransformer {
//       export type Payload = Prisma.ecommerce_platform_product_variant_optionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             attribute_key: true,
//             attribute_value: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             productVariant: EcommercePlatformProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_product_variant_optionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformProductVariantOption> {
//         return {
//   id: {string},
//   attributeKey: {string},
//   attributeValue: {string},
//   productVariant: await EcommercePlatformProductVariantAtSummaryTransformer.transform(input.productVariant),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------