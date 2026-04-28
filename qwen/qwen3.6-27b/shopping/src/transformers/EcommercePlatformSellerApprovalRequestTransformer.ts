import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformSellerAtSummaryTransformer } from "./EcommercePlatformSellerAtSummaryTransformer";

export namespace EcommercePlatformSellerApprovalRequestTransformer {
  export type Payload =
    Prisma.ecommerce_platform_seller_approval_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommercePlatformSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_seller_approval_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSellerApprovalRequest> {
    return {
      id: input.id,
      seller: await EcommercePlatformSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      status: input.status,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSellerApprovalRequestTransformer {
//       export type Payload = Prisma.ecommerce_platform_seller_approval_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: EcommercePlatformSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_seller_approval_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSellerApprovalRequest> {
//         return {
//   id: {string},
//   seller: await EcommercePlatformSellerAtSummaryTransformer.transform(input.seller),
//   status: {string},
//   reason: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------