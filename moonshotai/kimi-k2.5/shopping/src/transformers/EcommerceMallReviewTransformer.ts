import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
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
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        product: EcommerceMallProductAtSummaryTransformer.select(),
        order: EcommerceMallOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReview> {
    return {
      id: input.id,
      customer: { id: input.customer.id },
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      orderItemId: input.orderItem.id,
      rating: input.rating,
      content: input.content,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
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
//             content: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer_id: true,
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//             order: EcommerceMallOrderAtSummaryTransformer.select(),
//             order_item_id: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReview> {
//         return {
//   id: {string},
//   customer: {IEcommerceMallCustomer.ISummary},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//   orderItemId: {string},
//   rating: {integer},
//   content: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------