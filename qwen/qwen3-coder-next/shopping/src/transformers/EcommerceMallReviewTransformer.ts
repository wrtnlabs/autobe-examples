import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallReviewAtSummaryTransformer } from "./EcommerceMallReviewAtSummaryTransformer";

export namespace EcommerceMallReviewTransformer {
  export type Payload = Prisma.ecommerce_mall_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        text_content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        product: EcommerceMallProductAtSummaryTransformer.select(),
        orderItem: {
          select: { id: true },
        },
        snapshots: {
          select: {
            id: true,
            rating: true,
            text_content: true,
            snapshot_type: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs,
        helpfulnessVotes: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_review_helpfulness_votesFindManyArgs,
        images: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_review_imagesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReview> {
    const snapshot = input.snapshots[0];
    return {
      id: snapshot.id,
      review: await EcommerceMallReviewAtSummaryTransformer.transform(input),
      rating: snapshot.rating,
      text_content: snapshot.text_content ?? null,
      snapshot_type: snapshot.snapshot_type,
      created_at: snapshot.created_at.toISOString(),
    };
  }
}
