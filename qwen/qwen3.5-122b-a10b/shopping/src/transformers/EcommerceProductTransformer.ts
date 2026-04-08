import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";
import { EcommerceProductImageTransformer } from "./EcommerceProductImageTransformer";
import { EcommerceProductVariantTransformer } from "./EcommerceProductVariantTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

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
        seller: EcommerceSellerAtSummaryTransformer.select(),
        category: EcommerceCategoryAtSummaryTransformer.select(),
        productImages: EcommerceProductImageTransformer.select(),
        variants: EcommerceProductVariantTransformer.select(),
        wishlistItems: true,
        productSnapshots: true,
        reviews: true,
      },
    } satisfies Prisma.ecommerce_productsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceProduct> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: Number(input.base_price),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      category: await EcommerceCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      productImages: await ArrayUtil.asyncMap(
        input.productImages,
        EcommerceProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        EcommerceProductVariantTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceProduct;
  }
}
