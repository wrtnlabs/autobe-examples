import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerSessionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_sessionsGetPayload<
    ReturnType<typeof select>
  >;
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
        seller: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      status: input.expired_at > new Date() ? "active" : "expired",
    } satisfies IEcommerceMallSellerSession.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerSessionAtSummaryTransformer {
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
//             ecommerce_mall_seller_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerSession.ISummary> {
//         return {
//   id: {string},
//   ip: {string},
//   href: {string},
//   referrer: {string},
//   createdAt: {string},
//   expiredAt: {string},
//   status: {"active" | "expired"},
//         };
//       }
//     }
//--------------------------------------------------------------