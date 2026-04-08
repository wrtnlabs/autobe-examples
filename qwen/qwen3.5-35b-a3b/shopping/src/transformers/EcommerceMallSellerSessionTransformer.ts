import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerSessionTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        seller: { select: { id: true } },
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expired_at: true,
      },
    } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerSession> {
    return {
      id: input.id,
      ecommerce_mall_seller_id: input.seller.id,
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      expired_at: input.expired_at.toISOString(),
    } satisfies IEcommerceMallSellerSession;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerSessionTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_sessionsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             access_token: true,
//             refresh_token: true,
//             ip: true,
//             href: true,
//             referrer: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             expired_at: true,
//             ecommerce_mall_seller_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerSession> {
//         return {
//   id: {string},
//   ecommerce_mall_seller_id: {string},
//   access_token: {string},
//   refresh_token: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   expired_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------