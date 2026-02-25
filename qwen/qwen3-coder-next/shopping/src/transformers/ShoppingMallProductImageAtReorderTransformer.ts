import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductImageAtReorderTransformer {
  export type Payload = Prisma.shopping_mall_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select(productId: string) {
    return {
      select: {
        id: true,
        image_url: true,
        sort_order: true,
        product: {
          select: {
            id: true,
          },
        },
        createdBySeller: {
          select: {
            id: true,
          },
        },
      },
      where: {
        shopping_mall_product_id: productId,
      },
      orderBy: {
        sort_order: "asc",
      },
    } satisfies Prisma.shopping_mall_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IShoppingMallProductImage.IReorder> {
    return {
      image_order: input.map((item) => item.id),
      productId: input[0]?.product?.id ?? "",
    };
  }
}
