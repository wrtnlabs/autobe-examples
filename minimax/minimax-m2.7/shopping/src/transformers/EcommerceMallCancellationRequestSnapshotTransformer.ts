import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCancellationRequestSnapshotTransformer {
  // 1. Payload type first
  export type Payload =
    Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        cancellationRequest: {
          select: {
            id: true,
          },
        },
        reason: true,
        status: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequestSnapshot> {
    return {
      id: input.id,
      cancellationRequestId: input.cancellationRequest.id,
      reason: input.reason,
      status: input.status,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallCancellationRequestSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCancellationRequestSnapshotTransformer {
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
//             ecommerce_mall_cancellation_request_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCancellationRequestSnapshot> {
//         return {
//   id: {string},
//   cancellationRequestId: {string},
//   reason: {string},
//   status: {string},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------