import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerApprovalRequestAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_approval_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        request_reason: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        reviewer: EcommerceMallAdministratorAtSummaryTransformer.select(),
        snapshotHistories: true,
        snapshot: true,
      },
    } satisfies Prisma.ecommerce_mall_seller_approval_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerApprovalRequest.ISummary> {
    return {
      id: input.id,
      status: input.status,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      reviewer: input.reviewer
        ? await EcommerceMallAdministratorAtSummaryTransformer.transform(
            input.reviewer,
          )
        : undefined,
      rejection_reason: input.rejection_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallSellerApprovalRequest.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallSellerApprovalRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_seller_approval_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             status: true,
//             request_reason: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             reviewer: EcommerceMallAdministratorAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_seller_approval_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallSellerApprovalRequest.ISummary> {
//         return {
//   id: {string},
//   status: {string},
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   reviewer: await EcommerceMallAdministratorAtSummaryTransformer.transform(input.reviewer),
//   rejection_reason: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------