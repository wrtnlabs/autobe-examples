import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallCustomerReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReview";
import { IEcommerceMallCustomerReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReviewSnapshot";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import { EcommerceMallCustomerReviewSnapshotAtSummaryTransformer } from "./EcommerceMallCustomerReviewSnapshotAtSummaryTransformer";
import { EcommerceMallMemberAtSummaryTransformer } from "./EcommerceMallMemberAtSummaryTransformer";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallCustomerReviewTransformer {
  export type Payload = Prisma.ecommerce_mall_customer_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallMemberAtSummaryTransformer.select(),
        product: EcommerceMallProductAtSummaryTransformer.select(),
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        reviewSnapshots:
          EcommerceMallCustomerReviewSnapshotAtSummaryTransformer.select(),
        reviewAuditSnapshots: {
          select: {
            id: true,
            entity_type: true,
            action: true,
            entity_name: true,
            entity_status: true,
            metadata: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_customer_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerReview> {
    return {
      id: input.id,
      rating: input.rating,
      text: input.text ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      customer: await EcommerceMallMemberAtSummaryTransformer.transform(
        input.customer,
      ),
      customer_id: input.customer.id,
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      product_id: input.product.id,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      order_id: input.order.id,
      orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      order_item_id: input.orderItem.id,
      reviewSnapshots: await ArrayUtil.asyncMap(
        input.reviewSnapshots,
        EcommerceMallCustomerReviewSnapshotAtSummaryTransformer.transform,
      ),
      reviewAuditSnapshots: await ArrayUtil.asyncMap(
        input.reviewAuditSnapshots.filter(
          (audit) => audit.entity_type === "REVIEW",
        ),
        async (audit) => ({
          id: audit.id,
          rating: input.rating satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          review_text: audit.entity_name ?? null,
          version: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          created_at: audit.created_at.toISOString(),
          orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(
            input.orderItem,
          ),
          product: await EcommerceMallProductAtSummaryTransformer.transform(
            input.product,
          ),
        }),
      ),
    } satisfies IEcommerceMallCustomerReview;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerReviewTransformer {
//       export type Payload = Prisma.ecommerce_mall_customer_reviewsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             text: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: EcommerceMallMemberAtSummaryTransformer.select(),
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//             order: EcommerceMallOrderAtSummaryTransformer.select(),
//             orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
//             reviewSnapshots: EcommerceMallCustomerReviewSnapshotAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_customer_reviewsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomerReview> {
//         return {
//   customer: await EcommerceMallMemberAtSummaryTransformer.transform(input.customer),
//   customer_id: {string},
//   created_at: {string},
//   deleted_at: {string | null},
//   id: {string},
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//   order_id: {string},
//   orderItem: await EcommerceMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//   order_item_id: {string},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   product_id: {string},
//   rating: {integer},
//   reviewAuditSnapshots: {Array<IEcommerceMallReviewSnapshot.ISummary>},
//   reviewSnapshots: await ArrayUtil.asyncMap(input.reviewSnapshots, EcommerceMallCustomerReviewSnapshotAtSummaryTransformer.transform),
//   text: {string | null},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------