import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallSellerAdminRequestTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        reviewedBySuperAdmin:
          EcommerceMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerAdminRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      rejection_reason: input.rejection_reason ?? undefined,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      reviewedBySuperAdmin: input.reviewedBySuperAdmin
        ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(
            input.reviewedBySuperAdmin,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallSellerAdminRequest;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerAdminRequestTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_admin_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             reviewedBySuperAdmin: EcommerceMallSuperAdminAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_admin_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerAdminRequest> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   rejection_reason: {string | null},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   reviewedBySuperAdmin: input.reviewedBySuperAdmin ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(input.reviewedBySuperAdmin) : null,
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------