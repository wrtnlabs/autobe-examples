import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerProfileAtSummaryTransformer } from "./EcommerceMallSellerProfileAtSummaryTransformer";

export namespace EcommerceMallSellerAtInvertTransformer {
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
        sellerSessions: true,
        passwordResets: true,
        emailVerifications: true,
        adminRequest: true,
        profile: EcommerceMallSellerProfileAtSummaryTransformer.select(),
        adminRequests: true,
        products: true,
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
  ): Promise<IEcommerceMallSeller.IInvert> {
    if (!input.profile) throw new Error("Seller profile not found");
    return {
      id: input.id,
      approvalStatus: "approved",
      sellerProfile:
        await EcommerceMallSellerProfileAtSummaryTransformer.transform(
          input.profile,
        ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallSeller.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_sellersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             approval_status: true,
//             rejection_reason: true,
//             rejected_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             profile: EcommerceMallSellerProfileAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSeller.IInvert> {
//         return {
//   id: {string},
//   approvalStatus: {"approved"},
//   sellerProfile: await EcommerceMallSellerProfileAtSummaryTransformer.transform(input.profile),
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------