import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCancellationRequestAtSummaryTransformer } from "./EcommercePlatformCancellationRequestAtSummaryTransformer";
import { EcommercePlatformSnapshotAtSummaryTransformer } from "./EcommercePlatformSnapshotAtSummaryTransformer";

export namespace EcommercePlatformSnapshotCancellationRequestAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_platform_snapshot_cancellation_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        previous_reason: true,
        current_reason: true,
        previous_status: true,
        current_status: true,
        created_at: true,
        updated_at: true,
        snapshot: EcommercePlatformSnapshotAtSummaryTransformer.select(),
        cancellationRequest:
          EcommercePlatformCancellationRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_snapshot_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotCancellationRequest.ISummary> {
    return {
      id: input.id,
      previous_reason: input.previous_reason,
      current_reason: input.current_reason,
      previous_status: input.previous_status,
      current_status: input.current_status,
      snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(
        input.snapshot,
      ),
      cancellationRequest:
        await EcommercePlatformCancellationRequestAtSummaryTransformer.transform(
          input.cancellationRequest,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotCancellationRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshot_cancellation_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             previous_reason: true,
//             current_reason: true,
//             previous_status: true,
//             current_status: true,
//             created_at: true,
//             updated_at: true,
//             snapshot: EcommercePlatformSnapshotAtSummaryTransformer.select(),
//             cancellationRequest: EcommercePlatformCancellationRequestAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_cancellation_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotCancellationRequest.ISummary> {
//         return {
//   id: {string},
//   previous_reason: {string | null},
//   current_reason: {string | null},
//   previous_status: {string | null},
//   current_status: {string | null},
//   snapshot: await EcommercePlatformSnapshotAtSummaryTransformer.transform(input.snapshot),
//   cancellationRequest: await EcommercePlatformCancellationRequestAtSummaryTransformer.transform(input.cancellationRequest),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------