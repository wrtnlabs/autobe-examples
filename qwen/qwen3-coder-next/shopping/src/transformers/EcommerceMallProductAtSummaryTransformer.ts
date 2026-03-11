import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductImageAtSummaryTransformer } from "./EcommerceMallProductImageAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        is_available: true,
        created_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        images: {
          select: {
            id: true,
            image_url: true,
            sort_order: true,
            is_main: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.ISummary> {
    const mainImage =
      input.images.find((img) => img.is_main) || input.images[0];
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      is_available: input.is_available,
      created_at: toISOStringSafe(input.created_at),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      main_image:
        await EcommerceMallProductImageAtSummaryTransformer.transform(
          mainImage,
        ),
    };
  }
}
