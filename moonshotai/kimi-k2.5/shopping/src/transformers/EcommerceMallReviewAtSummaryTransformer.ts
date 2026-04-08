import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallReviewAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        customer: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        product: EcommerceMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReview.ISummary> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content,
      customer: input.customer && !input.customer.deleted_at ? {} : null,
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallReviewAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_reviewsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             content: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer_id: true,
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//             order_id: true,
//             order_item_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReview.ISummary> {
//         return {
//   id: {string},
//   rating: {integer},
//   content: {string | null},
//   customer: {IEcommerceMallCustomer.ISummary | null},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------