import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductImageAtSummaryTransformer } from "./EcommerceMallProductImageAtSummaryTransformer";

export namespace EcommerceMallProductAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.ISummary> {
    const variantPrices = input.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const priceRangeMin =
      variantPrices.length > 0 ? Math.min(...variantPrices) : input.base_price;
    const priceRangeMax =
      variantPrices.length > 0 ? Math.max(...variantPrices) : input.base_price;
    const isAvailable = input.variants.some((variant) => {
      const totalInventory = variant.inventoryRecords.reduce(
        (sum, r) => sum + (r as any).quantity,
        0,
      );
      return totalInventory > 0;
    });
    const reviewRatings = input.reviews.map((r) => r.rating);
    const averageRating =
      reviewRatings.length > 0
        ? reviewRatings.reduce((sum, r) => sum + r, 0) / reviewRatings.length
        : null;
    const thumbnailImage =
      input.images.length > 0
        ? await EcommerceMallProductImageAtSummaryTransformer.transform(
            input.images[0],
          )
        : null;
    const seller: IEcommerceMallSeller.ISummary = {
      id: input.seller.id,
      email: input.seller.email as string & tags.Format<"email">,
      shopName: "",
      approvalStatus: input.seller.approval_status,
      createdAt: toISOStringSafe(input.seller.created_at),
      updatedAt: toISOStringSafe(input.seller.updated_at),
      deletedAt: input.seller.deleted_at
        ? toISOStringSafe(input.seller.deleted_at)
        : null,
    };
    return {
      id: input.id,
      name: input.name,
      thumbnail: thumbnailImage ?? undefined,
      priceRangeMin,
      priceRangeMax,
      seller,
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      averageRating: averageRating ?? undefined,
      reviewCount: input._count.reviews,
      isAvailable,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
          },
          where: { display_order: 0 },
          take: 1,
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            price: true,
            inventoryRecords: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
        reviews: {
          select: { rating: true },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
        _count: { select: { reviews: true } },
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
}
