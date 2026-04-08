import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCancellationRequestAtSummaryTransformer {
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
        cancellationRequest: true,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IEcommerceMallCancellationRequest.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IEcommerceMallCancellationRequest.ISummary> {
    const parentId = input.cancellationRequest?.id ?? input.id;
    const summary = await cache.get(parentId);
    return typia.assert<IEcommerceMallCancellationRequest.ISummary>(summary);
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IEcommerceMallCancellationRequest.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (
        id: string,
      ): Promise<IEcommerceMallCancellationRequest.ISummary> => {
        const record =
          await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow(
            {
              ...select(),
              where: { id },
            },
          );
        return transform(record, cache);
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCancellationRequestAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_cancellation_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             createdAt: true,
//             cancellationRequest_id: true,
//             cancellationRequest: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IEcommerceMallCancellationRequest.ISummary>, [string]> = createParentCache(),
//       ): Promise<IEcommerceMallCancellationRequest.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   createdAt: {string},
//   cancellationRequest: input.cancellationRequest_id ? await cache.get(input.cancellationRequest_id) : null,
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IEcommerceMallCancellationRequest.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IEcommerceMallCancellationRequest.ISummary> => {
//             const record =
//               await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, cache);
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------