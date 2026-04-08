import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerApprovalAtSummaryTransformer } from "./EcommerceMallSellerApprovalAtSummaryTransformer";
import { EcommerceMallSellerProfileAtSummaryTransformer } from "./EcommerceMallSellerProfileAtSummaryTransformer";
import { EcommerceMallSellerSuspensionAtSummaryTransformer } from "./EcommerceMallSellerSuspensionAtSummaryTransformer";

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
        sellerSessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_sessionsFindManyArgs,
        passwordResets: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_password_resetsFindManyArgs,
        emailVerifications: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_email_verificationsFindManyArgs,
        adminRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_request_of_sellersFindManyArgs,
        profile: EcommerceMallSellerProfileAtSummaryTransformer.select(),
        adminRequests: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_admin_requestsFindManyArgs,
        products: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        productSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        shipments: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs,
        cancellationRequests: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
        refundRequests: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
        refundRequestSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs,
        sellerApprovals:
          EcommerceMallSellerApprovalAtSummaryTransformer.select(),
        sellerSuspensions:
          EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller> {
    if (!input.profile) {
      throw new HttpException("Seller profile not found", 404);
    }
    return {
      id: input.id,
      email: input.email,
      approvalStatus: input.approval_status,
      rejectionReason: input.rejection_reason,
      rejectedAt: input.rejected_at?.toISOString() ?? null,
      profile: await EcommerceMallSellerProfileAtSummaryTransformer.transform(
        input.profile,
      ),
      sellerApprovals: await ArrayUtil.asyncMap(
        input.sellerApprovals,
        EcommerceMallSellerApprovalAtSummaryTransformer.transform,
      ),
      sellerSuspensions: await ArrayUtil.asyncMap(
        input.sellerSuspensions,
        EcommerceMallSellerSuspensionAtSummaryTransformer.transform,
      ),
      approvalCount: input.sellerApprovals.length,
      suspensionCount: input.sellerSuspensions.length,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
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
//             password_hash: true,
//             approval_status: true,
//             rejection_reason: true,
//             rejected_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             sellerApprovals: EcommerceMallSellerApprovalAtSummaryTransformer.select(),
//             profile: EcommerceMallSellerProfileAtSummaryTransformer.select(),
//             sellerSuspensions: EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
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
//   profile: await EcommerceMallSellerProfileAtSummaryTransformer.transform(input.profile),
//   sellerApprovals: await ArrayUtil.asyncMap(input.sellerApprovals, EcommerceMallSellerApprovalAtSummaryTransformer.transform),
//   sellerSuspensions: await ArrayUtil.asyncMap(input.sellerSuspensions, EcommerceMallSellerSuspensionAtSummaryTransformer.transform),
//   approvalCount: {integer},
//   suspensionCount: {integer},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------