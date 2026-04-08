import { IEcommerceMallCustomerReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerReviewSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_customer_review_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        body: true,
        status: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_customer_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerReviewSnapshot.ISummary> {
    return {
      id: input.id,
      rating: input.rating,
      body: input.body,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
    } satisfies IEcommerceMallCustomerReviewSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerReviewSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_customer_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             body: true,
//             status: true,
//             created_at: true,
//           },
//         } satisfies Prisma.ecommerce_mall_customer_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomerReviewSnapshot.ISummary> {
//         return {
//   id: {string},
//   rating: {integer},
//   body: {string | null},
//   status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------