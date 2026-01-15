import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductImageTransformer {
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
        product: true,
      },
    } satisfies Prisma.shopping_mall_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductImage> {
    return {
      id: input.id,
      file_path: input.image_url,
      file_name: "",
      file_size: 0,
      mime_type: "",
      alt_text: "",
      caption: "",
      display_order: input.image_order,
      is_primary: input.is_primary ?? undefined,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
