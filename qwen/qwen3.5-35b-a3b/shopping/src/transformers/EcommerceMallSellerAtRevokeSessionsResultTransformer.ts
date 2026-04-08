import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtRevokeSessionsResultTransformer {
  export type Payload = Array<
    Prisma.ecommerce_mall_seller_sessionsGetPayload<ReturnType<typeof select>>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expired_at: true,
        seller: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.IRevokeSessionsResult> {
    const revokedAt = new Date().toISOString();
    return {
      seller_id: input[0]?.seller.id ?? "",
      revoked_session_ids: input.map((s) => s.id),
      count: input.length,
      revoked_at: revokedAt,
    } satisfies IEcommerceMallSeller.IRevokeSessionsResult;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerAtRevokeSessionsResultTransformer {
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
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSeller.IRevokeSessionsResult> {
//         return {
//   seller_id: {string},
//   revoked_session_ids: {Array<string>},
//   count: {integer},
//   revoked_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------