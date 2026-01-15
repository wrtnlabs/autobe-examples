import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductReviewImageAtSummaryTransformer {
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
        review: true,
      },
    } satisfies Prisma.shopping_mall_review_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductReviewImage.ISummary> {
    // Extract filename from URL path - assumes format like https://cdn.example.com/images/123.jpg
    const urlParts = input.image_url.split("/");
    const filename = urlParts[urlParts.length - 1];
    return {
      id: input.id,
      url: input.image_url,
      filename: filename,
      order: 0, // No order field in schema, using default 0
    };
  }
}
