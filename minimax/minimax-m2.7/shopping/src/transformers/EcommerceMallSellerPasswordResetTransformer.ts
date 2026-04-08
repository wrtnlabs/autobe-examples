import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerPasswordResetTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerPasswordReset> {
    const expiresAt = input.expires_at.toISOString();
    const usedAt = input.used_at?.toISOString() ?? null;
    // Compute status based on usedAt and expiresAt
    let status: "pending" | "used" | "expired";
    if (usedAt !== null) {
      status = "used";
    } else if (new Date(expiresAt) < new Date()) {
      status = "expired";
    } else {
      status = "pending";
    }
    return {
      id: input.id,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      token: input.token,
      expiresAt,
      usedAt,
      createdAt: input.created_at.toISOString(),
      status,
    } satisfies IEcommerceMallSellerPasswordReset;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerPasswordResetTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_password_resetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             token: true,
//             expires_at: true,
//             used_at: true,
//             created_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_password_resetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerPasswordReset> {
//         return {
//   id: {string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   token: {string},
//   expiresAt: {string},
//   usedAt: {string | null},
//   createdAt: {string},
//   status: {"pending" | "used" | "expired"},
//         };
//       }
//     }
//--------------------------------------------------------------