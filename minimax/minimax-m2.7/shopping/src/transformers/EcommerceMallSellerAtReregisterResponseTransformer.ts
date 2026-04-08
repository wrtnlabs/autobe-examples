import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtReregisterResponseTransformer {
  export interface ITokenBundle {
    accessToken: string;
    refreshToken: string;
    expiredAt: string;
  }
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
        } satisfies Prisma.ecommerce_mall_admin_request_of_sellersFindFirstArgs,
        profile: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_profilesFindFirstArgs,
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
        sellerApprovals: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_approvalsFindManyArgs,
        sellerSuspensions: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
    tokenBundle: ITokenBundle,
  ): Promise<IEcommerceMallSeller.IReregisterResponse> {
    return {
      id: input.id,
      email: input.email,
      approvalStatus: input.approval_status,
      accessToken: tokenBundle.accessToken,
      refreshToken: tokenBundle.refreshToken,
      expiredAt: tokenBundle.expiredAt,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IEcommerceMallSeller.IReregisterResponse;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerAtReregisterResponseTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommerceMallSeller.IReregisterResponse> {
//         return {
//   id: {string},
//   email: {string},
//   approvalStatus: {string},
//   accessToken: {string},
//   refreshToken: {string},
//   expiredAt: {string},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------