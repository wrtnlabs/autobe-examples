import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
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
        // Scalars
        id: true,
        email: true,
        password_hash: true,
        approval_status: true,
        rejection_reason: true,
        rejected_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Relations (schema required)
        sellerSessions: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs,
        passwordResets: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_password_resetsFindManyArgs,
        emailVerifications: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_email_verificationsFindManyArgs,
        adminRequest: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_admin_request_of_sellersFindManyArgs,
        profile: EcommerceMallSellerProfileAtSummaryTransformer.select(),
        adminRequests: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_admin_requestsFindManyArgs,
        products: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        productSnapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        shipments: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs,
        cancellationRequests: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
        refundRequests: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
        refundRequestSnapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs,
        sellerApprovals: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_approvalsFindManyArgs,
        sellerSuspensions: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.IInvert> {
    if (input.profile === null) {
      throw new Error("Seller profile is required");
    }
    return {
      id: input.id,
      approvalStatus: input.approval_status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      profile: await EcommerceMallSellerProfileAtSummaryTransformer.transform(
        input.profile,
      ),
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
//             approvalStatus: true,
//             createdAt: true,
//             id: true,
//             updatedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSeller.IInvert> {
//         return {
//   approvalStatus: {string},
//   createdAt: {string},
//   id: {string},
//   profile: {IEcommerceMallSellerProfile.ISummary},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------