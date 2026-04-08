import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        // Scalars for DTO
        id: true,
        email: true,
        approval_status: true,
        created_at: true,
        // Required schema scalars
        password_hash: true,
        rejection_reason: true,
        rejected_at: true,
        updated_at: true,
        deleted_at: true,
        // Required schema relations - hasMany
        sellerSessions: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs,
        passwordResets: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_password_resetsFindManyArgs,
        emailVerifications: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_email_verificationsFindManyArgs,
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
        // Required schema relations - hasOne
        adminRequest: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_admin_request_of_sellersFindFirstArgs,
        profile: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_profilesFindFirstArgs,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      approvalStatus: input.approval_status,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallSeller.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSeller.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   approvalStatus: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------