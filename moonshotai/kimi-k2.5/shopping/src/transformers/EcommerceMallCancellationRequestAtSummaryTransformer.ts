import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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

export namespace EcommerceMallCancellationRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
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
                    },
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
                    },
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
      },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCancellationRequest.ISummary> {
    const variantPrices = input.orderItem.product.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const priceRangeMin =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : input.orderItem.product.base_price;
    const priceRangeMax =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : input.orderItem.product.base_price;
    const reviewRatings = input.orderItem.product.reviews.map((r) => r.rating);
    const averageRating =
      reviewRatings.length > 0
        ? reviewRatings.reduce((sum, r) => sum + r, 0) / reviewRatings.length
        : undefined;
    return {
      id: input.id,
      status:
        input.status as IEcommerceMallCancellationRequest.ISummary["status"],
      reason: input.reason,
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
            deletedAt: input.seller.deleted_at
              ? input.seller.deleted_at.toISOString()
              : null,
          } satisfies IEcommerceMallSeller.ISummary)
        : null,
      orderItem: {
        id: input.orderItem.id,
        quantity: input.orderItem.quantity,
        priceAtPurchase: input.orderItem.price_at_purchase,
        status: input.orderItem
          .status as IEcommerceMallOrderItem.ISummary["status"],
        createdAt: input.orderItem.created_at.toISOString(),
        product: {
          id: input.orderItem.product.id,
          name: input.orderItem.product.name,
          thumbnail:
            input.orderItem.product.images.length > 0
              ? ({
                  id: input.orderItem.product.images[0].id,
                  imageUrl: input.orderItem.product.images[0].image_url,
                  displayOrder: input.orderItem.product.images[0].display_order,
                } satisfies IEcommerceMallProductImage.ISummary)
              : undefined,
          priceRangeMin,
          priceRangeMax,
          seller: {
            id: input.orderItem.product.seller.id,
            email: input.orderItem.product.seller.email as string &
              tags.Format<"email">,
            shopName: "",
            approvalStatus: input.orderItem.product.seller.approval_status,
            createdAt: input.orderItem.product.seller.created_at.toISOString(),
            updatedAt: input.orderItem.product.seller.updated_at.toISOString(),
            deletedAt: input.orderItem.product.seller.deleted_at
              ? input.orderItem.product.seller.deleted_at.toISOString()
              : null,
          } satisfies IEcommerceMallSeller.ISummary,
          category: {
            id: input.orderItem.product.category.id,
            name: input.orderItem.product.category.name,
            description: input.orderItem.product.category.description,
            createdAt:
              input.orderItem.product.category.created_at.toISOString(),
            parent: input.orderItem.product.category.parent
              ? ({
                  id: input.orderItem.product.category.parent.id,
                  name: input.orderItem.product.category.parent.name,
                } satisfies IParentReference)
              : null,
          } satisfies IEcommerceMallCategory.ISummary,
          averageRating,
          reviewCount: input.orderItem.product._count.reviews,
          isAvailable: input.orderItem.product.variants.some((variant) => {
            const totalStock = variant.inventoryRecords.reduce(
              (sum, r) => sum + r.quantity_change,
              0,
            );
            return totalStock > 0;
          }),
        } satisfies IEcommerceMallProduct.ISummary,
        variant: {
          id: input.orderItem.variant.id,
          skuCode: input.orderItem.variant.sku_code,
          price: input.orderItem.variant.price,
          options: await ArrayUtil.asyncMap(
            input.orderItem.variant.variantOptions,
            async (opt) =>
              ({
                id: opt.id,
                optionName: opt.option_name,
                optionValue: opt.option_value,
              }) satisfies IEcommerceMallProductVariantOption.ISummary,
          ),
          currentStock: input.orderItem.variant.inventoryRecords.reduce(
            (sum, r) => sum + r.quantity_change,
            0,
          ),
          isAvailable:
            input.orderItem.variant.inventoryRecords.reduce(
              (sum, r) => sum + r.quantity_change,
              0,
            ) > 0 && input.orderItem.variant.deleted_at === null,
          createdAt: input.orderItem.variant.created_at.toISOString(),
        } satisfies IEcommerceMallProductVariant.ISummary,
        seller: {
          id: input.orderItem.seller.id,
          email: input.orderItem.seller.email as string & tags.Format<"email">,
          shopName: "",
          approvalStatus: input.orderItem.seller.approval_status,
          createdAt: input.orderItem.seller.created_at.toISOString(),
          updatedAt: input.orderItem.seller.updated_at.toISOString(),
          deletedAt: input.orderItem.seller.deleted_at
            ? input.orderItem.seller.deleted_at.toISOString()
            : null,
        } satisfies IEcommerceMallSeller.ISummary,
      } satisfies IEcommerceMallOrderItem.ISummary,
      createdAt: input.created_at.toISOString(),
    };
  }
}
