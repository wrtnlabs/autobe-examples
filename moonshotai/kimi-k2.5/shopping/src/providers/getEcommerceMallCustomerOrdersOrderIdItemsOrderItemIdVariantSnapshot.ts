import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallProductVariantSnapshotAtInvertTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdVariantSnapshot(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariantSnapshot.IInvert> {
  // Verify order exists and belongs to customer
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
    },
    select: { id: true },
  });
  // Find the order item within the order with necessary relations
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.orderItemId,
        order_id: props.orderId,
      },
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
            description: true,
            base_price: true,
            created_at: true,
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                parent_id: true,
                subcategories: { select: { id: true } },
                created_at: true,
                updated_at: true,
              },
            },
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                created_at: true,
                deleted_at: true,
                registrations: { select: { status: true, created_at: true } },
              },
            },
            images: {
              select: { id: true, image_url: true, display_order: true },
            },
            variants: { select: { id: true, price: true } },
            reviews: { select: { id: true, rating: true, deleted_at: true } },
          },
        },
        variant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            created_at: true,
            updated_at: true,
            variantOptions: {
              select: { id: true, option_name: true, option_value: true },
            },
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            deleted_at: true,
            registrations: { select: { status: true, created_at: true } },
          },
        },
      },
    });
  // Get the order item snapshot to find the variant snapshot
  const orderItemSnapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findUniqueOrThrow(
      {
        where: { order_item_id: orderItem.id },
        select: { variant_snapshot_id: true },
      },
    );
  // Fetch the variant snapshot with option values
  const variantSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: { id: orderItemSnapshot.variant_snapshot_id },
        ...EcommerceMallProductVariantSnapshotAtInvertTransformer.select(),
      },
    );
  // Build product summary
  const prices = orderItem.product.variants.map((v) =>
    v.price !== null && v.price !== undefined
      ? Number(v.price)
      : Number(orderItem.product.base_price),
  );
  const minPrice =
    prices.length > 0
      ? Math.min(...prices)
      : Number(orderItem.product.base_price);
  const maxPrice =
    prices.length > 0
      ? Math.max(...prices)
      : Number(orderItem.product.base_price);
  const activeReviews = orderItem.product.reviews.filter(
    (r) => r.deleted_at === null,
  );
  const averageRating =
    activeReviews.length > 0
      ? activeReviews.reduce((sum, r) => sum + r.rating, 0) /
        activeReviews.length
      : null;
  const thumbnailImage =
    orderItem.product.images.sort(
      (a, b) => a.display_order - b.display_order,
    )[0]?.image_url ?? null;
  const sellerRegistration = orderItem.seller.registrations.sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime(),
  )[0];
  const sellerSummary: IEcommerceMallSeller.ISummary = {
    id: orderItem.seller.id,
    email: orderItem.seller.email,
    approvalStatus: orderItem.seller
      .approval_status as IEcommerceMallSeller.ISummary["approvalStatus"],
    createdAt: orderItem.seller.created_at.toISOString(),
    deletedAt: orderItem.seller.deleted_at?.toISOString() ?? null,
    registrationCount: orderItem.seller.registrations.length,
    latestRegistrationStatus: sellerRegistration?.status ?? null,
  };
  // Build order item summary
  const orderItemSummary: IEcommerceMallOrderItem.ISummary = {
    id: orderItem.id,
    quantity: orderItem.quantity,
    priceAtPurchase: orderItem.price_at_purchase,
    status: orderItem.status as IEcommerceMallOrderItem.ISummary["status"],
    createdAt: orderItem.created_at.toISOString(),
    product: {
      id: orderItem.product.id,
      name: orderItem.product.name,
      description: orderItem.product.description,
      basePrice: Number(orderItem.product.base_price),
      thumbnailImage: thumbnailImage ?? undefined,
      priceRange: { minPrice, maxPrice },
      category: {
        id: orderItem.product.category.id,
        name: orderItem.product.category.name,
        description: orderItem.product.category.description ?? undefined,
        parentId: orderItem.product.category.parent_id,
        subcategoryCount: orderItem.product.category.subcategories.length,
        createdAt: orderItem.product.category.created_at.toISOString(),
        updatedAt: orderItem.product.category.updated_at.toISOString(),
      },
      seller: sellerSummary,
      averageRating,
      reviewCount: activeReviews.length,
      availabilityStatus: "available",
      createdAt: orderItem.product.created_at.toISOString(),
    },
    variant: {
      id: orderItem.variant.id,
      skuCode: orderItem.variant.sku_code,
      price: orderItem.variant.price,
      options: orderItem.variant.variantOptions.map((opt) => ({
        id: opt.id,
        optionName: opt.option_name,
        optionValue: opt.option_value,
      })),
      createdAt: orderItem.variant.created_at.toISOString(),
      updatedAt: orderItem.variant.updated_at.toISOString(),
    },
    seller: sellerSummary,
  };
  // Transform the variant snapshot
  const transformedSnapshot =
    await EcommerceMallProductVariantSnapshotAtInvertTransformer.transform(
      variantSnapshot,
    );
  return {
    id: transformedSnapshot.id,
    skuCode: transformedSnapshot.skuCode,
    price: transformedSnapshot.price,
    createdAt: transformedSnapshot.createdAt,
    optionValues: transformedSnapshot.optionValues,
    orderItem: orderItemSummary,
  };
}
