import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductImageAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        image_order: true,
        is_primary: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductImage.ISummary> {
    // Extract filename from image_url (last part after last slash)
    const filename = input.image_url.substring(
      input.image_url.lastIndexOf("/") + 1,
    );
    // Split filename by last dot to separate name and extension
    const lastDotIndex = filename.lastIndexOf(".");
    const name =
      lastDotIndex > -1 ? filename.substring(0, lastDotIndex) : filename;
    const extension =
      lastDotIndex > -1 ? filename.substring(lastDotIndex + 1) : "";
    return {
      id: input.id,
      url: input.image_url,
      name: name,
      extension: extension,
      order: input.image_order,
      is_primary: input.is_primary,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
