import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IReviewAnalyticsReviewPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsReviewPreview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ReviewAnalyticsReviewPreviewTransformer {
  export type Payload = Prisma.ecommerce_mall_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        text_content: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        product: true,
      },
    } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IReviewAnalyticsReviewPreview> {
    return {
      id: input.id,
      rating: input.rating,
      textContent: input.text_content ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
