import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
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
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";

export namespace EcommerceMallCartItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer_id: true,
        productVariant:
          EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCartItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      productVariant:
        await EcommerceMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      createdAt: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCartItemAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer_id: true,
//             productVariant: EcommerceMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCartItem.ISummary> {
//         return {
//   id: {string},
//   quantity: {integer},
//   productVariant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------