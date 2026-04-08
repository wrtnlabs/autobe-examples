import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductAtSummaryTransformer {
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
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            parent_id: true,
            subcategories: {
              select: {
                id: true,
              },
            } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            deleted_at: true,
            registrations: {
              select: {
                status: true,
                created_at: true,
              },
            } satisfies Prisma.ecommerce_mall_seller_registrationsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
          },
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            id: true,
            price: true,
            inventoryRecords: {
              select: {
                quantity_change: true,
              },
            } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
        reviews: {
          select: {
            id: true,
            rating: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.ISummary> {
    const prices = input.variants.map((v) =>
      v.price !== null && v.price !== undefined
        ? Number(v.price)
        : Number(input.base_price),
    );
    const minPrice =
      prices.length > 0 ? Math.min(...prices) : Number(input.base_price);
    const maxPrice =
      prices.length > 0 ? Math.max(...prices) : Number(input.base_price);
    const activeReviews = input.reviews.filter((r) => r.deleted_at === null);
    const reviewCount = activeReviews.length;
    const averageRating =
      activeReviews.length > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) /
          activeReviews.length
        : null;
    const thumbnailImage =
      input.images.sort((a, b) => a.display_order - b.display_order)[0]
        ?.image_url ?? null;
    const isAvailable = input.variants.some((variant) => {
      const stock = variant.inventoryRecords.reduce(
        (sum, inv) => sum + inv.quantity_change,
        0,
      );
      return stock > 0;
    });
    const category: IEcommerceMallCategory.ISummary = {
      id: input.category.id,
      name: input.category.name,
      description: input.category.description ?? undefined,
      parentId: input.category.parent_id,
      parent: undefined,
      subcategoryCount: input.category.subcategories.length,
      createdAt: input.category.created_at.toISOString(),
      updatedAt: input.category.updated_at.toISOString(),
    };
    const latestSellerRegistration = input.seller.registrations.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    )[0];
    const seller: IEcommerceMallSeller.ISummary = {
      id: input.seller.id,
      email: input.seller.email,
      approvalStatus: input.seller
        .approval_status as IEcommerceMallSeller.ISummary["approvalStatus"],
      createdAt: input.seller.created_at.toISOString(),
      deletedAt: input.seller.deleted_at?.toISOString() ?? null,
      registrationCount: input.seller.registrations.length,
      latestRegistrationStatus: latestSellerRegistration?.status ?? null,
    };
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: Number(input.base_price),
      thumbnailImage: thumbnailImage ?? undefined,
      priceRange: {
        minPrice,
        maxPrice,
      } satisfies IEcommerceMallProduct.IPriceRange,
      category,
      seller,
      averageRating,
      reviewCount: reviewCount satisfies number as number,
      availabilityStatus: isAvailable ? "available" : "unavailable",
      createdAt: input.created_at.toISOString(),
    };
  }
}
