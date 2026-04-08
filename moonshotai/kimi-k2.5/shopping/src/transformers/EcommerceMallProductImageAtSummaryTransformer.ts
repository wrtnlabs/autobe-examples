import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductImageAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductImage.ISummary> {
    return {
      id: input.id,
      imageUrl: input.image_url,
      displayOrder: input.display_order,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        display_order: true,
      },
    } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs;
  }
}
