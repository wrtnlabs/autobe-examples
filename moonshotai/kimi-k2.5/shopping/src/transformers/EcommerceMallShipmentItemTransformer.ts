import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallShipmentItemTransformer {
  export type Payload = Prisma.ecommerce_mall_shipment_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shipment_id: true,
        order_item_id: true,
        created_at: true,
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
                },
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
                },
                images: {
                  select: {
                    id: true,
                    image_url: true,
                    display_order: true,
                  },
                  where: { display_order: 0 },
                  take: 1,
                },
                variants: {
                  select: {
                    price: true,
                    inventoryRecords: {
                      select: {
                        quantity_change: true,
                      },
                    },
                  },
                },
                reviews: {
                  select: { rating: true },
                },
                _count: { select: { reviews: true } },
              },
            },
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
                },
                inventoryRecords: {
                  select: {
                    quantity_change: true,
                  },
                },
              },
            },
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShipmentItem> {
    const orderItem = input.orderItem;
    // Calculate product summary values
    const variantPrices = orderItem.product.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const priceRangeMin =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : orderItem.product.base_price;
    const priceRangeMax =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : orderItem.product.base_price;
    const isAvailable = orderItem.product.variants.some((variant) => {
      const totalInventory = variant.inventoryRecords.reduce(
        (sum, r) => sum + r.quantity_change,
        0,
      );
      return totalInventory > 0;
    });
    const reviewRatings = orderItem.product.reviews.map((r) => r.rating);
    const averageRating =
      reviewRatings.length > 0
        ? reviewRatings.reduce((sum, r) => sum + r, 0) / reviewRatings.length
        : null;
    const thumbnailImage =
      orderItem.product.images.length > 0
        ? ({
            id: orderItem.product.images[0].id,
            imageUrl: orderItem.product.images[0].image_url,
            displayOrder: orderItem.product.images[0].display_order,
          } satisfies IEcommerceMallProductImage.ISummary)
        : null;
    // Calculate variant current stock
    const currentStock = orderItem.variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    return {
      id: input.id,
      shipmentId: input.shipment_id,
      orderItemId: input.order_item_id,
      orderItem: {
        id: orderItem.id,
        quantity: orderItem.quantity,
        priceAtPurchase: orderItem.price_at_purchase,
        status: orderItem.status as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
        createdAt: orderItem.created_at.toISOString(),
        product: {
          id: orderItem.product.id,
          name: orderItem.product.name,
          thumbnail: thumbnailImage ?? undefined,
          priceRangeMin,
          priceRangeMax,
          seller: {
            id: orderItem.product.seller.id,
            email: orderItem.product.seller.email as string &
              tags.Format<"email">,
            shopName: "",
            approvalStatus: orderItem.product.seller.approval_status,
            createdAt: orderItem.product.seller.created_at.toISOString(),
            updatedAt: orderItem.product.seller.updated_at.toISOString(),
            deletedAt: orderItem.product.seller.deleted_at
              ? orderItem.product.seller.deleted_at.toISOString()
              : null,
          } satisfies IEcommerceMallSeller.ISummary,
          category: {
            id: orderItem.product.category.id,
            name: orderItem.product.category.name,
            description: orderItem.product.category.description,
            createdAt: orderItem.product.category.created_at.toISOString(),
            parent: orderItem.product.category.parent
              ? {
                  id: orderItem.product.category.parent.id,
                  name: orderItem.product.category.parent.name,
                }
              : null,
          } satisfies IEcommerceMallCategory.ISummary,
          averageRating: averageRating ?? undefined,
          reviewCount: orderItem.product._count.reviews,
          isAvailable,
        } satisfies IEcommerceMallProduct.ISummary,
        variant: {
          id: orderItem.variant.id,
          skuCode: orderItem.variant.sku_code,
          price: orderItem.variant.price ?? null,
          options: await ArrayUtil.asyncMap(
            orderItem.variant.variantOptions,
            async (opt) =>
              ({
                id: opt.id,
                optionName: opt.option_name,
                optionValue: opt.option_value,
              }) satisfies IEcommerceMallProductVariantOption.ISummary,
          ),
          currentStock,
          isAvailable:
            currentStock > 0 && orderItem.variant.deleted_at === null,
          createdAt: orderItem.variant.created_at.toISOString(),
        } satisfies IEcommerceMallProductVariant.ISummary,
        seller: {
          id: orderItem.seller.id,
          email: orderItem.seller.email as string & tags.Format<"email">,
          shopName: "",
          approvalStatus: orderItem.seller.approval_status,
          createdAt: orderItem.seller.created_at.toISOString(),
          updatedAt: orderItem.seller.updated_at.toISOString(),
          deletedAt: orderItem.seller.deleted_at
            ? orderItem.seller.deleted_at.toISOString()
            : null,
        } satisfies IEcommerceMallSeller.ISummary,
      } satisfies IEcommerceMallOrderItem.ISummary,
      createdAt: input.created_at.toISOString(),
    };
  }
}
