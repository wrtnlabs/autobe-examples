import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerSessionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_seller_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        seller: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_seller_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IShoppingMallSellerSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallSellerSessionAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_seller_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             expired_at: true,
//             seller_id: true,
//           },
//         } satisfies Prisma.shopping_mall_seller_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallSellerSession.ISummary> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------