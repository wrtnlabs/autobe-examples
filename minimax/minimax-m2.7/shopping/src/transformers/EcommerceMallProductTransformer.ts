import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        deleted_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            seller_profiles: {
              select: {
                id: true,
                name: true,
                description: true,
                logo_uri: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            parent: {
              select: {
                id: true,
                name: true,
                description: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
        productImages: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
            created_at: true,
            updated_at: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            quantity: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            optionValues: {
              select: {
                id: true,
                key: true,
                value: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
        reviews: {
          select: {
            id: true,
            rating: true,
            content: true,
            created_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                profile: {
                  select: {
                    display_name: true,
                  },
                },
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                seller: {
                  select: {
                    seller_profiles: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
                productImages: {
                  select: {
                    image_url: true,
                  },
                  orderBy: {
                    display_order: "asc",
                  },
                  take: 1,
                },
                variants: {
                  select: {
                    price: true,
                  },
                },
                reviews: {
                  select: {
                    rating: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
        productSnapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        wishlistItems: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs,
        orderItems: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct> {
    // Filter active reviews for aggregation
    const activeReviews = input.reviews.filter((r) => r.deleted_at === null);
    const reviews_count: number = activeReviews.length;
    const average_rating: number =
      reviews_count > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / reviews_count
        : 0;
    // Transform seller
    const seller_profile = input.seller.seller_profiles?.[0];
    const seller = {
      id: input.seller.id,
      name: seller_profile?.name ?? "",
      description: seller_profile?.description ?? "",
      logo_uri: seller_profile?.logo_uri ?? null,
      seller: {
        id: input.seller.id,
        email: input.seller.email,
        approval_status: input.seller.approval_status,
        created_at: toISOStringSafe(input.seller.created_at),
        profile: {
          id: seller_profile?.id ?? "",
          name: seller_profile?.name ?? "",
          description: seller_profile?.description ?? "",
          logo_uri: seller_profile?.logo_uri ?? null,
          seller_id: input.seller.id,
          created_at: seller_profile?.created_at
            ? toISOStringSafe(seller_profile.created_at)
            : "",
          updated_at: seller_profile?.updated_at
            ? toISOStringSafe(seller_profile.updated_at)
            : "",
          deleted_at: seller_profile?.deleted_at
            ? toISOStringSafe(seller_profile.deleted_at)
            : null,
        },
      },
      created_at: seller_profile?.created_at
        ? toISOStringSafe(seller_profile.created_at)
        : "",
      updated_at: seller_profile?.updated_at
        ? toISOStringSafe(seller_profile.updated_at)
        : "",
      deleted_at: seller_profile?.deleted_at
        ? toISOStringSafe(seller_profile.deleted_at)
        : null,
    };
    // Transform category
    const category = {
      id: input.category.id,
      name: input.category.name,
      description: input.category.description ?? undefined,
      parent: input.category.parent
        ? {
            id: input.category.parent.id,
            name: input.category.parent.name,
            description: input.category.parent.description ?? undefined,
            parent: input.category.parent.parent
              ? {
                  id: input.category.parent.parent.id,
                  name: input.category.parent.parent.name,
                  description:
                    input.category.parent.parent.description ?? undefined,
                }
              : undefined,
          }
        : undefined,
    };
    // Transform product images
    const product_images = await Promise.all(
      input.productImages.map(async (img) => {
        const product_for_img = img.product;
        return {
          id: img.id,
          image_url: img.image_url,
          display_order: img.display_order,
          created_at: toISOStringSafe(img.created_at),
          updated_at: toISOStringSafe(img.updated_at),
          product: {
            id: product_for_img.id,
            name: product_for_img.name,
            min_price: product_for_img.base_price,
            max_price: product_for_img.base_price,
            primary_image_url:
              product_for_img.productImages?.[0]?.image_url ?? "",
            seller_name: "",
            average_rating: 0,
            reviews_count: 0,
            created_at: toISOStringSafe(product_for_img.created_at),
          },
        };
      }),
    );
    // Transform variants
    const variants = await Promise.all(
      input.variants.map(async (v) => {
        return {
          id: v.id,
          sku_code: v.sku_code,
          price: v.price !== null ? Number(v.price) : undefined,
          quantity: Number(v.quantity),
          optionValues: v.optionValues.map((ov) => ({
            id: ov.id,
            key: ov.key,
            value: ov.value,
            created_at: toISOStringSafe(ov.created_at),
            updated_at: toISOStringSafe(ov.updated_at),
            variant: {
              id: v.id,
              sku_code: v.sku_code,
              price: v.price !== null ? Number(v.price) : undefined,
              quantity: Number(v.quantity),
              optionValues: [],
              created_at: toISOStringSafe(v.created_at),
              updated_at: toISOStringSafe(v.updated_at),
            },
          })),
          created_at: toISOStringSafe(v.created_at),
          updated_at: toISOStringSafe(v.updated_at),
          deleted_at: v.deleted_at ? toISOStringSafe(v.deleted_at) : null,
        };
      }),
    );
    // Transform reviews
    const reviews = await Promise.all(
      input.reviews.map(async (r) => {
        // Compute product summary for review
        const activeProductReviews = r.product.reviews.filter(
          (rev) => rev.deleted_at === null,
        );
        const productReviewsCount = activeProductReviews.length;
        const productAvgRating =
          productReviewsCount > 0
            ? activeProductReviews.reduce((sum, rev) => sum + rev.rating, 0) /
              productReviewsCount
            : 0;
        const productPrices = r.product.variants
          .map((v) => v.price)
          .filter((p): p is number => p !== null);
        const productMinPrice =
          productPrices.length > 0
            ? Math.min(...productPrices)
            : r.product.base_price;
        const productMaxPrice =
          productPrices.length > 0
            ? Math.max(...productPrices)
            : r.product.base_price;
        const sellerProfileName =
          r.product.seller?.seller_profiles?.[0]?.name ?? "";
        return {
          id: r.id,
          rating: r.rating,
          content: r.content ?? undefined,
          created_at: toISOStringSafe(r.created_at),
          customer: {
            id: r.customer.id,
            email: r.customer.email,
            created_at: toISOStringSafe(r.customer.created_at),
            display_name: r.customer.profile?.display_name ?? null,
            status: "active" as const,
          },
          product: {
            id: r.product.id,
            name: r.product.name,
            min_price: productMinPrice,
            max_price: productMaxPrice,
            primary_image_url: r.product.productImages?.[0]?.image_url ?? "",
            seller_name: sellerProfileName,
            average_rating: productAvgRating,
            reviews_count: productReviewsCount,
            created_at: toISOStringSafe(r.product.created_at),
          },
        };
      }),
    );
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      seller: seller,
      category: category,
      product_images: product_images,
      variants: variants,
      reviews: reviews,
      average_rating: average_rating,
      reviews_count: reviews_count as number & tags.Type<"int32">,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
