import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallReviewAtSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        review: {
          select: {
            id: true,
            rating: true,
            content: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                created_at: true,
                deleted_at: true,
                seller: {
                  select: {
                    id: true,
                    email: true,
                    created_at: true,
                    deleted_at: true,
                  },
                } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    parent_id: true,
                    created_at: true,
                    updated_at: true,
                  },
                } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
              },
            } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReview.ISnapshot> {
    const review = input.review;
    const customer = review.customer;
    const product = review.product;
    const seller = product.seller;
    const category = product.category;
    return {
      id: input.id,
      review: {
        id: review.id,
        rating: review.rating,
        content: review.content ?? null,
        customer: customer
          ? ({
              id: customer.id,
              email: customer.email,
              createdAt: customer.created_at.toISOString(),
              deletedAt: customer.deleted_at?.toISOString() ?? null,
            } satisfies IEcommerceMallCustomer.ISummary)
          : null,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          basePrice: product.base_price,
          thumbnailImage: undefined,
          priceRange: {
            minPrice: product.base_price,
            maxPrice: product.base_price,
          },
          category: {
            id: category.id,
            name: category.name,
            description: category.description,
            parentId: category.parent_id,
            parent: undefined,
            subcategoryCount: 0,
            createdAt: category.created_at.toISOString(),
            updatedAt: category.updated_at.toISOString(),
          } satisfies IEcommerceMallCategory.ISummary,
          seller: {
            id: seller.id,
            email: seller.email as string & tags.Format<"email">,
            approvalStatus: "approved" as const,
            createdAt: seller.created_at.toISOString(),
            deletedAt: seller.deleted_at?.toISOString() ?? null,
            registrationCount: 0,
            latestRegistrationStatus: null,
          } satisfies IEcommerceMallSeller.ISummary,
          averageRating: null,
          reviewCount: 0,
          availabilityStatus: "available" as const,
          createdAt: product.created_at.toISOString(),
        } satisfies IEcommerceMallProduct.ISummary,
        createdAt: review.created_at.toISOString(),
      } satisfies IEcommerceMallReview.ISummary,
      rating: input.rating,
      content: input.content ?? null,
      customerSnapshot: {
        id: customer.id,
        email: customer.email,
        createdAt: customer.created_at.toISOString(),
        deletedAt: customer.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallCustomer.ISummary,
      productSnapshot: {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: product.base_price,
        thumbnailImage: undefined,
        priceRange: {
          minPrice: product.base_price,
          maxPrice: product.base_price,
        },
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          parentId: category.parent_id,
          parent: undefined,
          subcategoryCount: 0,
          createdAt: category.created_at.toISOString(),
          updatedAt: category.updated_at.toISOString(),
        } satisfies IEcommerceMallCategory.ISummary,
        seller: {
          id: seller.id,
          email: seller.email as string & tags.Format<"email">,
          approvalStatus: "approved" as const,
          createdAt: seller.created_at.toISOString(),
          deletedAt: seller.deleted_at?.toISOString() ?? null,
          registrationCount: 0,
          latestRegistrationStatus: null,
        } satisfies IEcommerceMallSeller.ISummary,
        averageRating: null,
        reviewCount: 0,
        availabilityStatus: "available" as const,
        createdAt: product.created_at.toISOString(),
      } satisfies IEcommerceMallProduct.ISummary,
      createdAt: input.created_at.toISOString(),
    };
  }
}
