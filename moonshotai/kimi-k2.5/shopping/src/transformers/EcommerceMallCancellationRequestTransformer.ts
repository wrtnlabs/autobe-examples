import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCancellationRequestTransformer {
  export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        response_reason: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            price_at_purchase: true,
            status: true,
            created_at: true,
            product: {
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
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    parent: {
                      select: {
                        id: true,
                        name: true,
                      },
                    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
                  },
                } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
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
                    inventoryRecords: {
                      select: {
                        quantity_change: true,
                      },
                    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
                  },
                } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
                reviews: {
                  select: { rating: true },
                } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
                _count: { select: { reviews: true } },
              },
            } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
            variant: {
              select: {
                id: true,
                sku_code: true,
                price: true,
                created_at: true,
                deleted_at: true,
                variantOptions: {
                  select: {
                    id: true,
                    option_name: true,
                    option_value: true,
                  },
                } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs,
                inventoryRecords: {
                  select: {
                    quantity_change: true,
                  },
                } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
              },
            } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
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
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        customer: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
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
        snapshots: {
          select: {
            id: true,
            cancellationRequest: {
              select: {
                id: true,
              },
            } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
            status_before: true,
            status_after: true,
            reason_before: true,
            reason_after: true,
            reviewer_note: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequest> {
    // Transform product summary
    const productData = input.orderItem.product;
    const variantPrices = productData.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const priceRangeMin =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : productData.base_price;
    const priceRangeMax =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : productData.base_price;
    const isAvailable = productData.variants.some((variant) => {
      const totalInventory = variant.inventoryRecords.reduce(
        (sum, r) => sum + r.quantity_change,
        0,
      );
      return totalInventory > 0;
    });
    const reviewRatings = productData.reviews.map((r) => r.rating);
    const averageRating =
      reviewRatings.length > 0
        ? reviewRatings.reduce((sum, r) => sum + r, 0) / reviewRatings.length
        : null;
    const thumbnailImage =
      productData.images.length > 0
        ? ({
            id: productData.images[0].id,
            imageUrl: productData.images[0].image_url,
            displayOrder: productData.images[0].display_order,
          } satisfies IEcommerceMallProductImage.ISummary)
        : null;
    // Transform variant summary
    const variantData = input.orderItem.variant;
    const variantCurrentStock = variantData.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as IEcommerceMallCancellationRequest["status"],
      responseReason: input.response_reason ?? null,
      respondedAt: input.responded_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      orderItem: {
        id: input.orderItem.id,
        quantity: input.orderItem.quantity,
        priceAtPurchase: input.orderItem.price_at_purchase,
        status: input.orderItem
          .status as IEcommerceMallOrderItem.ISummary["status"],
        createdAt: input.orderItem.created_at.toISOString(),
        product: {
          id: productData.id,
          name: productData.name,
          thumbnail: thumbnailImage ?? undefined,
          priceRangeMin,
          priceRangeMax,
          seller: {
            id: productData.seller.id,
            email: productData.seller.email as string & tags.Format<"email">,
            shopName: "",
            approvalStatus: productData.seller.approval_status,
            createdAt: productData.seller.created_at.toISOString(),
            updatedAt: productData.seller.updated_at.toISOString(),
            deletedAt: productData.seller.deleted_at?.toISOString() ?? null,
          } satisfies IEcommerceMallSeller.ISummary,
          category: {
            id: productData.category.id,
            name: productData.category.name,
            description: productData.category.description,
            createdAt: productData.category.created_at.toISOString(),
            parent: productData.category.parent
              ? {
                  id: productData.category.parent.id,
                  name: productData.category.parent.name,
                }
              : null,
          } satisfies IEcommerceMallCategory.ISummary,
          averageRating: averageRating ?? undefined,
          reviewCount: productData._count.reviews,
          isAvailable,
        } satisfies IEcommerceMallProduct.ISummary,
        variant: {
          id: variantData.id,
          skuCode: variantData.sku_code,
          price: variantData.price ?? null,
          options: variantData.variantOptions.map((opt) => ({
            id: opt.id,
            optionName: opt.option_name,
            optionValue: opt.option_value,
          })) satisfies IEcommerceMallProductVariantOption.ISummary[],
          currentStock: variantCurrentStock,
          isAvailable:
            variantCurrentStock > 0 && variantData.deleted_at === null,
          createdAt: variantData.created_at.toISOString(),
        } satisfies IEcommerceMallProductVariant.ISummary,
        seller: {
          id: input.orderItem.seller.id,
          email: input.orderItem.seller.email as string & tags.Format<"email">,
          shopName: "",
          approvalStatus: input.orderItem.seller.approval_status,
          createdAt: input.orderItem.seller.created_at.toISOString(),
          updatedAt: input.orderItem.seller.updated_at.toISOString(),
          deletedAt: input.orderItem.seller.deleted_at?.toISOString() ?? null,
        } satisfies IEcommerceMallSeller.ISummary,
      } satisfies IEcommerceMallOrderItem.ISummary,
      customer: {
        id: input.customer.id,
        email: input.customer.email,
        createdAt: input.customer.created_at.toISOString(),
        updatedAt: input.customer.updated_at.toISOString(),
        deletedAt: input.customer.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallCustomer.ISummary,
      seller: input.seller
        ? ({
            id: input.seller.id,
            email: input.seller.email as string & tags.Format<"email">,
            shopName: "",
            approvalStatus: input.seller.approval_status,
            createdAt: input.seller.created_at.toISOString(),
            updatedAt: input.seller.updated_at.toISOString(),
            deletedAt: input.seller.deleted_at?.toISOString() ?? null,
          } satisfies IEcommerceMallSeller.ISummary)
        : null,
      snapshots: input.snapshots.map((snapshot) => ({
        id: snapshot.id,
        cancellationRequestId: snapshot.cancellationRequest.id,
        statusBefore: snapshot.status_before,
        statusAfter: snapshot.status_after,
        reasonBefore: snapshot.reason_before ?? null,
        reasonAfter: snapshot.reason_after ?? null,
        reviewerNote: snapshot.reviewer_note ?? null,
        createdAt: snapshot.created_at.toISOString(),
      })) satisfies IEcommerceMallCancellationRequestSnapshot[],
    };
  }
}
