import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallAdministratorAtSummaryTransformer } from "./ECommerceMallAdministratorAtSummaryTransformer";
import { ECommerceMallSellerAtSummaryTransformer } from "./ECommerceMallSellerAtSummaryTransformer";

export namespace ECommerceMallSellerApprovalRequestAtSummaryTransformer {
  export type Payload =
    Prisma.e_commerce_mall_seller_approval_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ECommerceMallSellerAtSummaryTransformer.select(),
        reviewer: ECommerceMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_seller_approval_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallSellerApprovalRequest.ISummary> {
    return {
      id: input.id,
      seller: await ECommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      status: input.status,
      rejection_reason: input.rejection_reason,
      reviewer: input.reviewer
        ? await ECommerceMallAdministratorAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallSellerApprovalRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallSellerApprovalRequestAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_seller_approval_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             rejection_reason: true,
//             reviewed_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: ECommerceMallSellerAtSummaryTransformer.select(),
//             reviewer: ECommerceMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_seller_approval_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallSellerApprovalRequest.ISummary> {
//         return {
//   id: {string},
//   seller: await ECommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   status: {string},
//   rejection_reason: {string | null},
//   reviewer: input.reviewer ? await ECommerceMallAdministratorAtSummaryTransformer.transform(input.reviewer) : null,
//   reviewed_at: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------