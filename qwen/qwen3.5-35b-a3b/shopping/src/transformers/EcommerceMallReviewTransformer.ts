import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallMemberAtSummaryTransformer } from "./EcommerceMallMemberAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallReviewTransformer {
  export type Payload = Prisma.ecommerce_mall_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        review_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: EcommerceMallMemberAtSummaryTransformer.select(),
        product: EcommerceMallProductAtSummaryTransformer.select(),
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        snapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReview> {
    return {
      id: input.id,
      rating: input.rating,
      review_text: input.review_text ?? undefined,
      member: await EcommerceMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallReview;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallReviewTransformer {
//       export type Payload = Prisma.ecommerce_mall_reviewsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             review_text: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: EcommerceMallMemberAtSummaryTransformer.select(),
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//             orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReview> {
//         return {
//   id: {string},
//   rating: {integer},
//   review_text: {string | null},
//   member: await EcommerceMallMemberAtSummaryTransformer.transform(input.member),
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------