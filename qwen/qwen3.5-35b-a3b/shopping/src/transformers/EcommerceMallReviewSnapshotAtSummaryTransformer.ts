import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallReviewSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        review_text: true,
        version: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        review: { select: { id: true } },
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        product: EcommerceMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReviewSnapshot.ISummary> {
    return {
      id: input.id,
      rating: input.rating,
      review_text: input.review_text,
      version: input.version,
      created_at: input.created_at.toISOString(),
      orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
    } satisfies IEcommerceMallReviewSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallReviewSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             review_text: true,
//             version: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ecommerce_mall_review_id: true,
//             orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReviewSnapshot.ISummary> {
//         return {
//   id: {string},
//   rating: {integer},
//   review_text: {string | null},
//   version: {integer},
//   created_at: {string},
//   orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//         };
//       }
//     }
//--------------------------------------------------------------