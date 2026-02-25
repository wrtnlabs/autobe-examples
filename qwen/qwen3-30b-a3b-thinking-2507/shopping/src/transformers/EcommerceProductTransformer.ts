import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";
import { EcommerceProductImageTransformer } from "./EcommerceProductImageTransformer";
import { EcommerceProductVariantTransformer } from "./EcommerceProductVariantTransformer";

export namespace EcommerceProductTransformer {
  export type Payload = Prisma.ecommerce_productsGetPayload<
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
        deleted_at: true,
        category: EcommerceCategoryAtSummaryTransformer.select(),
        variants: EcommerceProductVariantTransformer.select(),
        images: EcommerceProductImageTransformer.select(),
      },
    } satisfies Prisma.ecommerce_productsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceProduct> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: Number(input.base_price),
      category: await EcommerceCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        EcommerceProductVariantTransformer.transform,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        EcommerceProductImageTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
