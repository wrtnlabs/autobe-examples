import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCategoryAtSummaryTransformer } from "./EcommerceCategoryAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceProductAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
        category: EcommerceCategoryAtSummaryTransformer.select(),
        reviews: {
          select: {
            rating: true,
          },
        } satisfies Prisma.ecommerce_reviewsFindManyArgs,
        productImages: {
          select: {
            image_url: true,
            display_order: true,
          },
          orderBy: { display_order: "asc" },
        } satisfies Prisma.ecommerce_product_imagesFindManyArgs,
        variants: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_product_variantsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProduct.ISummary> {
    // Compute average rating from reviews
    let average_rating: number | null = null;
    if (input.reviews.length > 0) {
      const sum = input.reviews.reduce((acc, review) => acc + review.rating, 0);
      average_rating = sum / input.reviews.length;
    }
    // Get main image URL (first image by display_order)
    const main_image_url: string | null =
      input.productImages.length > 0 ? input.productImages[0].image_url : null;
    // Compute stock status from variants
    const stock_status =
      input.variants.length > 0 ? "in_stock" : "out_of_stock";
    return {
      id: input.id,
      name: input.name,
      base_price: Number(input.base_price),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      category: await EcommerceCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      average_rating: average_rating,
      main_image_url: main_image_url,
      stock_status: stock_status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceProduct.ISummary;
  }
}
