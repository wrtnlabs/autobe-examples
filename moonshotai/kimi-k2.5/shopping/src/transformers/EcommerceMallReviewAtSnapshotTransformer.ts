import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallReviewAtSummaryTransformer } from "./EcommerceMallReviewAtSummaryTransformer";

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
          ...EcommerceMallReviewAtSummaryTransformer.select(),
          select: {
            ...EcommerceMallReviewAtSummaryTransformer.select().select,
            customer: {
              select: {
                id: true,
                created_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallReview.ISnapshot> {
    const product = input.review.product;
    const customer = input.review.customer;
    // Calculate price range from variants
    const variantPrices = product.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const minPrice =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : product.base_price;
    const maxPrice =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : product.base_price;
    // Calculate average rating
    const ratings = product.reviews?.map((r) => r.rating) ?? [];
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : null;
    // Check availability from inventory records
    const hasAvailableInventory = product.variants.some(
      (variant) =>
        variant.inventoryRecords.some(
          (inv) =>
            (inv.reason === "restock" && inv.quantity_change > 0) ||
            (inv.reason === "order_placed" && inv.quantity_change < 0),
        ) &&
        variant.inventoryRecords.reduce(
          (sum, inv) => sum + inv.quantity_change,
          0,
        ) > 0,
    );
    const availabilityStatus: "available" | "unavailable" =
      hasAvailableInventory ? "available" : "unavailable";
    // Get thumbnail image - first image sorted by display_order
    const sortedImages = [...(product.images ?? [])].sort(
      (a, b) => a.display_order - b.display_order,
    );
    const thumbnailImage =
      sortedImages.length > 0 ? sortedImages[0].image_url : null;
    // Get seller data via type assertion for access to payload structure
    const sellerData = product.seller as any;
    const productSnapshot: IEcommerceMallProduct.ISummary = {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.base_price,
      thumbnailImage,
      priceRange: { minPrice, maxPrice },
      category: {
        id: product.category.id,
        name: product.category.name,
        description: product.category.description,
        parentId: product.category.parent_id ?? null,
        subcategoryCount: (product.category as any).subcategories?.length ?? 0,
        createdAt: product.category.created_at.toISOString(),
        updatedAt: product.category.updated_at.toISOString(),
      } satisfies IEcommerceMallCategory.ISummary,
      seller: {
        id: sellerData.id,
        email: sellerData.email,
        approvalStatus: sellerData.approval_status ?? "pending",
        createdAt: sellerData.created_at.toISOString(),
        deletedAt: sellerData.deleted_at?.toISOString() ?? null,
        registrationCount: sellerData.registrations?.length ?? 0,
        latestRegistrationStatus: sellerData.registrations?.[0]?.status ?? null,
      } satisfies IEcommerceMallSeller.ISummary,
      averageRating,
      reviewCount: (product._count?.reviews ??
        product.reviews?.length ??
        0) satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
      availabilityStatus,
      createdAt: product.created_at.toISOString(),
    };
    // IEcommerceMallCustomer.ISummary is empty interface - minimal object
    const customerSnapshot: IEcommerceMallCustomer.ISummary = {};
    return {
      id: input.id,
      rating: input.rating,
      content: input.content,
      createdAt: input.created_at.toISOString(),
      review: await EcommerceMallReviewAtSummaryTransformer.transform(
        input.review,
      ),
      customerSnapshot,
      productSnapshot,
    } satisfies IEcommerceMallReview.ISnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallReviewAtSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_review_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             rating: true,
//             content: true,
//             created_at: true,
//             review: EcommerceMallReviewAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_review_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallReview.ISnapshot> {
//         return {
//   id: {string},
//   review: await EcommerceMallReviewAtSummaryTransformer.transform(input.review),
//   rating: {integer},
//   content: {string | null},
//   customerSnapshot: {IEcommerceMallCustomer.ISummary},
//   productSnapshot: {IEcommerceMallProduct.ISummary},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------