import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export namespace EcommerceMallCartItemTransformer {
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
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        productVariant:
          EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCartItem> {
    return {
      id: input.id,
      customer: {} satisfies IEcommerceMallCustomer.ISummary,
      productVariant:
        await EcommerceMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      quantity: input.quantity,
      subtotal: input.quantity * (input.productVariant.price ?? 0),
      stockAvailability: "in_stock" as const,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCartItemTransformer {
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
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCartItem> {
//         return {
//   id: {string},
//   customer: {IEcommerceMallCustomer.ISummary},
//   productVariant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   quantity: {integer},
//   subtotal: {number},
//   stockAvailability: {"in_stock" | "low_stock" | "out_of_stock"},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------