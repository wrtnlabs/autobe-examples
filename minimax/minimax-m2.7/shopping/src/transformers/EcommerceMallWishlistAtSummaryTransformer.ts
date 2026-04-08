import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallWishlistAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_wishlistsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        wishlistItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_wishlistsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallWishlist.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    } satisfies IEcommerceMallWishlist.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallWishlistAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_wishlistsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             customer: EcommerceMallCustomerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_wishlistsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallWishlist.ISummary> {
//         return {
//   id: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   customer: await EcommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//         };
//       }
//     }
//--------------------------------------------------------------