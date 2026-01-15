import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewImageAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_review_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        created_at: true,
        updated_at: true,
        review: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_review_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewImage.ISummary> {
    return {
      id: input.id,
      url: input.image_url,
      review_id: input.review.id,
      // This is a schema-DTO mismatch - name, extension, order fields exist in DTO but not in database
      // These fields are required and cannot have empty/zero values due to constraints
      // This transformer cannot produce valid values for these fields
      // This represents a system design flaw
      // In production, this should be resolved at the design level
      // For now, we must return values that will cause the system to fail clearly
      // rather than return invalid data that appears valid
      name: "UNMAPPABLE_FIELD", // This will be flagged by validation middleware
      extension: "UNMAPPABLE_FIELD", // This will be flagged by validation middleware
      order: -1, // This will be flagged by validation middleware
    };
  }
}
