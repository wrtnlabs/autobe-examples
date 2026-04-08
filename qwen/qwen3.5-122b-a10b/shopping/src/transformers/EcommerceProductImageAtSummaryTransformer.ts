import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductAtSummaryTransformer } from "./EcommerceProductAtSummaryTransformer";

export namespace EcommerceProductImageAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_product_imagesGetPayload<
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
        deleted_at: true,
        product: EcommerceProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_product_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductImage.ISummary> {
    return {
      id: input.id,
      image_url: input.image_url,
      display_order: input.display_order,
      product: await EcommerceProductAtSummaryTransformer.transform(
        input.product,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IEcommerceProductImage.ISummary;
  }
}
