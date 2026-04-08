import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
          },
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
        variants: EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        async (item) =>
          ({
            id: item.id,
            imageUrl: item.image_url,
            displayOrder: item.display_order,
          }) satisfies IEcommerceMallProductImage.ISummary,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        EcommerceMallProductVariantAtSummaryTransformer.transform,
      ),
    };
  }
}
