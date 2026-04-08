import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerProfileTransformer } from "./EcommerceMallSellerProfileTransformer";

export namespace EcommerceMallSellerTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        approval_status: true,
        rejection_reason: true,
        rejected_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: EcommerceMallSellerProfileTransformer.select(),
        products: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        sellerSessions: true,
        passwordResets: true,
        emailVerifications: true,
        adminRequest: true,
        adminRequests: true,
        productSnapshots: true,
        shipments: true,
        cancellationRequests: true,
        refundRequests: true,
        refundRequestSnapshots: true,
        sellerApprovals: true,
        sellerSuspensions: true,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller> {
    if (input.profile === null)
      throw new Error(
        "Seller profile is required but not found for seller: " + input.id,
      );
    return {
      id: input.id,
      email: input.email,
      approvalStatus: input.approval_status,
      rejectionReason: input.rejection_reason ?? null,
      rejectedAt:
        input.rejected_at !== null ? toISOStringSafe(input.rejected_at) : null,
      profile: await EcommerceMallSellerProfileTransformer.transform(
        input.profile,
      ),
      productsCount: input.products.length,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallSeller;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerTransformer {
//       export type Payload = Prisma.ecommerce_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             approvalStatus: true,
//             rejectionReason: true,
//             rejectedAt: true,
//             productsCount: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSeller> {
//         return {
//   id: {string},
//   email: {string},
//   approvalStatus: {string},
//   rejectionReason: {string | null},
//   rejectedAt: {string | null},
//   profile: {IEcommerceMallSellerProfile},
//   productsCount: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------