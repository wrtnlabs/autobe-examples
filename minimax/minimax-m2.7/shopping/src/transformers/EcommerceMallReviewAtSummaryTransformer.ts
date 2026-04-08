import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
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
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        product: EcommerceMallProductAtSummaryTransformer.select(),
        orderItem: {
          select: {
            id: true,
          } satisfies Prisma.ecommerce_mall_order_itemsSelect,
        },
        reviewSnapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReview.ISummary> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content ?? null,
      createdAt: toISOStringSafe(input.created_at),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
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
//             content: true,
//             createdAt: true,
//             id: true,
//             rating: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReview.ISummary> {
//         return {
//   content: {string | null},
//   createdAt: {string},
//   customer: {IEcommerceMallCustomer.ISummary},
//   id: {string},
//   product: {IEcommerceMallProduct.ISummary},
//   rating: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------