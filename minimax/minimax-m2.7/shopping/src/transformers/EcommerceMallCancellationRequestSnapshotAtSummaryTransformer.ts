import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
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
        reason: true,
        status: true,
        created_at: true,
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
      reason: input.reason,
      status: input.status,
      createdAt: input.created_at.toISOString(),
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
//             reason: true,
//             status: true,
//             created_at: true,
//             cancellationRequest: EcommerceMallCancellationRequestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCancellationRequestSnapshot.ISummary> {
//         return {
//   cancellationRequest: await EcommerceMallCancellationRequestAtSummaryTransformer.transform(input.cancellationRequest),
//   createdAt: {string},
//   id: {string},
//   reason: {string},
//   status: {string},
//         };
//       }
//     }
//--------------------------------------------------------------