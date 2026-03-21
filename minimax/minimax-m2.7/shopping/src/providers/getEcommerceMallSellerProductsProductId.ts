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
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProduct> {
  // Verify product exists and belongs to the requesting seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
        ecommerce_mall_seller_id: props.seller.id,
      },
    });
  // Fetch full product with all nested relations using correct schema property names
  const fullProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: product.id },
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
            seller_profile: {
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
        },
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
        },
        product_images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
            created_at: true,
            updated_at: true,
          },
          orderBy: { display_order: "asc" },
        },
        variants: {
          where: { deleted_at: null },
          select: {
            id: true,
            sku_code: true,
            price: true,
            quantity: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            option_values: {
              select: {
                id: true,
                key: true,
                value: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
        reviews: {
          where: { deleted_at: null },
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
                customer_profiles: {
                  select: {
                    display_name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  // Compute aggregations
  const activeReviews = fullProduct.reviews.filter(
    (r) => r.deleted_at === null,
  );
  const reviews_count = activeReviews.length;
  const average_rating =
    reviews_count > 0
      ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / reviews_count
      : 0;
  // Transform seller profile
  const seller_profile = fullProduct.seller.seller_profile;
  const seller: IEcommerceMallSellerProfile = {
    id: seller_profile?.id ?? "",
    name: seller_profile?.name ?? "",
    description: seller_profile?.description ?? "",
    logo_uri: seller_profile?.logo_uri ?? null,
    seller: {
      id: fullProduct.seller.id,
      email: fullProduct.seller.email,
      approval_status: fullProduct.seller.approval_status,
      created_at: toISOStringSafe(fullProduct.seller.created_at),
      profile: {
        id: seller_profile?.id ?? "",
        name: seller_profile?.name ?? "",
        description: seller_profile?.description ?? "",
        logo_uri: seller_profile?.logo_uri ?? null,
        seller_id: fullProduct.seller.id,
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
  const category: IEcommerceMallCategory.ISummary = {
    id: fullProduct.category.id,
    name: fullProduct.category.name,
    description: fullProduct.category.description ?? undefined,
    parent: fullProduct.category.parent
      ? {
          id: fullProduct.category.parent.id,
          name: fullProduct.category.parent.name,
          description: fullProduct.category.parent.description ?? undefined,
          parent: fullProduct.category.parent.parent
            ? {
                id: fullProduct.category.parent.parent.id,
                name: fullProduct.category.parent.parent.name,
                description:
                  fullProduct.category.parent.parent.description ?? undefined,
              }
            : undefined,
        }
      : undefined,
  };
  // Transform product images
  const product_images: IEcommerceMallProductImage[] =
    fullProduct.product_images.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      display_order: img.display_order,
      created_at: toISOStringSafe(img.created_at),
      updated_at: toISOStringSafe(img.updated_at),
      product: {
        id: fullProduct.id,
        name: fullProduct.name,
        min_price: fullProduct.base_price,
        max_price: fullProduct.base_price,
        primary_image_url: fullProduct.product_images[0]?.image_url ?? "",
        seller_name: seller.name,
        average_rating: average_rating,
        reviews_count: reviews_count as number & tags.Type<"int32">,
        created_at: toISOStringSafe(fullProduct.created_at),
      },
    }));
  // Transform variants
  const variants: IEcommerceMallProductVariant[] = fullProduct.variants.map(
    (v) => ({
      id: v.id,
      sku_code: v.sku_code,
      price: v.price !== null ? Number(v.price) : undefined,
      quantity: Number(v.quantity),
      optionValues: v.option_values.map((ov) => ({
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
    }),
  );
  // Transform reviews
  const reviews: IEcommerceMallReview.ISummary[] = activeReviews.map((r) => {
    const display_name =
      r.customer.customer_profiles?.[0]?.display_name ?? null;
    return {
      id: r.id,
      rating: r.rating,
      content: r.content ?? undefined,
      created_at: toISOStringSafe(r.created_at),
      customer: {
        id: r.customer.id,
        email: r.customer.email,
        created_at: toISOStringSafe(r.customer.created_at),
        display_name: display_name,
        status: "active" as const,
      },
      product: {
        id: fullProduct.id,
        name: fullProduct.name,
        min_price: fullProduct.base_price,
        max_price: fullProduct.base_price,
        primary_image_url: fullProduct.product_images[0]?.image_url ?? "",
        seller_name: seller.name,
        average_rating: average_rating,
        reviews_count: reviews_count as number & tags.Type<"int32">,
        created_at: toISOStringSafe(fullProduct.created_at),
      },
    };
  });
  return {
    id: fullProduct.id,
    name: fullProduct.name,
    description: fullProduct.description,
    base_price: fullProduct.base_price,
    seller: seller,
    category: category,
    product_images: product_images,
    variants: variants,
    reviews: reviews,
    average_rating: average_rating,
    reviews_count: reviews_count as number & tags.Type<"int32">,
    created_at: toISOStringSafe(fullProduct.created_at),
    updated_at: toISOStringSafe(fullProduct.updated_at),
    deleted_at:
      fullProduct.deleted_at != null
        ? toISOStringSafe(fullProduct.deleted_at)
        : null,
  };
}
