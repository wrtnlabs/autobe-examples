import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallProductImageAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductImage.IInvert> {
    return {
      id: input.id,
      image_url: input.image_url,
      display_order: input.display_order,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
    };
  }
}
