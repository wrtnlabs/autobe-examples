import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSaleImageTransformer {
  export type Payload = Prisma.shopping_mall_sale_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_sale_id: true,
        image_url: true,
        display_order: true,
        alt_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sale: true,
      },
    } satisfies Prisma.shopping_mall_sale_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleImage> {
    return {
      id: input.id,
      shoppingMallSaleId: input.shopping_mall_sale_id,
      imageUrl: input.image_url,
      displayOrder: input.display_order,
      altText: input.alt_text ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
