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

export async function putEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IUpdate;
}): Promise<IEcommerceMallProduct> {
  // Fetch product with minimal data needed for ownership check and snapshot creation
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        ecommerce_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
        },
        productImages: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  // Ownership verification
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if product is deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product is deleted", 400);
  }
  // Validate category if provided
  if (props.body.ecommerce_mall_category_id !== undefined) {
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique(
      {
        where: { id: props.body.ecommerce_mall_category_id },
      },
    );
    if (!category) {
      throw new HttpException("Invalid category", 400);
    }
  }
  // Create snapshot and update product in transaction
  const snapshotId = v4();
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        ecommerce_mall_product_id: product.id,
        ecommerce_mall_seller_id: product.ecommerce_mall_seller_id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        category_name: product.category.name,
        created_at: now,
        productSnapshotVariants: {
          create: product.variants.map((variant) => ({
            id: v4(),
            sku: variant.sku_code,
            price_override: variant.price,
            stock_quantity: variant.quantity,
            created_at: now,
            optionValues: {
              create: variant.optionValues.map((ov) => ({
                id: v4(),
                key: ov.key,
                value: ov.value,
                created_at: now,
              })),
            },
          })),
        },
        productSnapshotImages: {
          create: product.productImages.map((img) => ({
            id: v4(),
            url: img.image_url,
            display_order: img.display_order,
            created_at: now,
            updated_at: now,
          })),
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_products.update({
      where: { id: props.productId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.base_price !== undefined && {
          base_price: props.body.base_price,
        }),
        ...(props.body.ecommerce_mall_category_id !== undefined && {
          ecommerce_mall_category_id: props.body.ecommerce_mall_category_id,
        }),
        updated_at: now,
      },
    }),
  ]);
  // Fetch updated product with seller and reviews for response
  const updatedProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
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
        productImages: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
            created_at: true,
            updated_at: true,
          },
        },
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
        },
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
              },
            },
          },
        },
      },
    });
  // Transform to response DTO
  const seller_profile = updatedProduct.seller.seller_profiles?.[0];
  const seller: IEcommerceMallSellerProfile = {
    id: seller_profile?.id ?? "",
    name: seller_profile?.name ?? "",
    description: seller_profile?.description ?? "",
    logo_uri: seller_profile?.logo_uri ?? null,
    seller: {
      id: updatedProduct.seller.id,
      email: updatedProduct.seller.email,
      approval_status: updatedProduct.seller.approval_status,
      created_at: toISOStringSafe(updatedProduct.seller.created_at),
      profile: {
        id: seller_profile?.id ?? "",
        name: seller_profile?.name ?? "",
        description: seller_profile?.description ?? "",
        logo_uri: seller_profile?.logo_uri ?? null,
        seller_id: updatedProduct.seller.id,
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
  const category: IEcommerceMallCategory.ISummary = {
    id: updatedProduct.category.id,
    name: updatedProduct.category.name,
    description: updatedProduct.category.description ?? undefined,
    parent: updatedProduct.category.parent
      ? {
          id: updatedProduct.category.parent.id,
          name: updatedProduct.category.parent.name,
          description: updatedProduct.category.parent.description ?? undefined,
          parent: updatedProduct.category.parent.parent
            ? {
                id: updatedProduct.category.parent.parent.id,
                name: updatedProduct.category.parent.parent.name,
                description:
                  updatedProduct.category.parent.parent.description ??
                  undefined,
              }
            : undefined,
        }
      : undefined,
  };
  const product_images: IEcommerceMallProductImage[] =
    updatedProduct.productImages.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      display_order: img.display_order,
      created_at: toISOStringSafe(img.created_at),
      updated_at: toISOStringSafe(img.updated_at),
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        min_price: updatedProduct.base_price,
        max_price: updatedProduct.base_price,
        primary_image_url: img.image_url,
        seller_name: seller.name,
        average_rating: 0,
        reviews_count: 0,
        created_at: toISOStringSafe(updatedProduct.created_at),
      },
    }));
  const variants: IEcommerceMallProductVariant[] = updatedProduct.variants.map(
    (v) => ({
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
    }),
  );
  // Filter active reviews for aggregation
  const activeReviews = updatedProduct.reviews.filter(
    (r) => r.deleted_at === null,
  );
  const reviews_count: number = activeReviews.length;
  const average_rating: number =
    reviews_count > 0
      ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / reviews_count
      : 0;
  const reviews: IEcommerceMallReview.ISummary[] = activeReviews.map((r) => ({
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
      min_price: r.product.base_price,
      max_price: r.product.base_price,
      primary_image_url: "",
      seller_name: seller.name,
      average_rating: 0,
      reviews_count: 0,
      created_at: toISOStringSafe(r.product.created_at),
    },
  }));
  return {
    id: updatedProduct.id,
    name: updatedProduct.name,
    description: updatedProduct.description,
    base_price: updatedProduct.base_price,
    seller: seller,
    category: category,
    product_images: product_images,
    variants: variants,
    reviews: reviews,
    average_rating: average_rating,
    reviews_count: reviews_count as number & tags.Type<"int32">,
    created_at: toISOStringSafe(updatedProduct.created_at),
    updated_at: toISOStringSafe(updatedProduct.updated_at),
    deleted_at:
      updatedProduct.deleted_at != null
        ? toISOStringSafe(updatedProduct.deleted_at)
        : null,
  };
}
