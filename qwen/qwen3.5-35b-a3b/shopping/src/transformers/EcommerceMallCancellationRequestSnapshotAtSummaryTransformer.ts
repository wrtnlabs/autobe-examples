import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "./EcommerceMallCancellationRequestAtSummaryTransformer";

export namespace EcommerceMallCancellationRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        actor_type: true,
        created_at: true,
        approved_at: true,
        rejected_at: true,
        seller_rejection_reason: true,
        created_by: true,
        deleted_at: true,
        cancellationRequest:
          EcommerceMallCancellationRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequestSnapshot.ISummary> {
    return {
      id: input.id,
      title: input.title,
      actor_type: input.actor_type,
      created_at: input.created_at.toISOString(),
      approved_at: input.approved_at?.toISOString() ?? null,
      rejected_at: input.rejected_at?.toISOString() ?? null,
      seller_rejection_reason: input.seller_rejection_reason ?? null,
      cancellationRequest:
        await EcommerceMallCancellationRequestAtSummaryTransformer.transform(
          input.cancellationRequest,
        ),
    } satisfies IEcommerceMallCancellationRequestSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCancellationRequestSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             title: true,
//             body: true,
//             actor_type: true,
//             created_at: true,
//             approved_at: true,
//             rejected_at: true,
//             seller_rejection_reason: true,
//             created_by: true,
//             deleted_at: true,
//             cancellationRequest: EcommerceMallCancellationRequestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCancellationRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   title: {string},
//   actor_type: {string},
//   created_at: {string},
//   approved_at: {string | null},
//   rejected_at: {string | null},
//   seller_rejection_reason: {string | null},
//   cancellationRequest: await EcommerceMallCancellationRequestAtSummaryTransformer.transform(input.cancellationRequest),
//         };
//       }
//     }
//--------------------------------------------------------------