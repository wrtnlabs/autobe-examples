import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewResponse";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceReviewAtSummaryTransformer } from "./EcommerceReviewAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceReviewResponseTransformer {
  export type Payload = Prisma.ecommerce_review_responsesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        body: true,
        created_at: true,
        updated_at: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
        review: EcommerceReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_review_responsesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewResponse> {
    return {
      id: input.id,
      body: input.body,
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      review: await EcommerceReviewAtSummaryTransformer.transform(input.review),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
