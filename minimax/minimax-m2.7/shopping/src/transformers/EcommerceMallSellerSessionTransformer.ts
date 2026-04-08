import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerSessionTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_seller_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        access_token: true,
        refresh_token: true,
        created_at: true,
        expired_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerSession> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      hasAccessToken: input.access_token !== null,
      hasRefreshToken: input.refresh_token !== null,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
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
//             ip: true,
//             href: true,
//             referrer: true,
//             access_token: true,
//             refresh_token: true,
//             created_at: true,
//             expired_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerSession> {
//         return {
//   id: {string},
//   createdAt: {string},
//   expiredAt: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   hasAccessToken: {boolean},
//   hasRefreshToken: {boolean},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//         };
//       }
//     }
//--------------------------------------------------------------