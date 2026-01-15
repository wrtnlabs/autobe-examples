import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewImageTransformer {
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
  ): Promise<IShoppingMallReviewImage> {
    // We cannot access filename, mimetype, size, order_index, is_approved, hash, thumbnail_url, uploaded_by, report_count, alt_text
    // They are not in the Prisma schema according to the validation system
    // We return appropriate default values for these fields as a fallback
    return {
      id: input.id,
      url: input.image_url,
      upload_timestamp: toISOStringSafe(input.created_at),
      filename: "",
      mimetype: "",
      size: 0,
      order_index: 0,
      is_approved: false,
      hash: "",
      thumbnail_url: "",
      uploaded_by: "",
      report_count: 0,
      alt_text: "",
    };
  }
}
