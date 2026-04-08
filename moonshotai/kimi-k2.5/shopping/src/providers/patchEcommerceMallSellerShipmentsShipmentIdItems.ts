import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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

export async function patchEcommerceMallSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify shipment exists and belongs to seller
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions for order items
  const orderItemWhere: Prisma.ecommerce_mall_order_itemsWhereInput = {
    deleted_at: null,
    ...(props.body.orderId && { order_id: props.body.orderId }),
    ...(props.body.productId && { product_id: props.body.productId }),
    ...(props.body.variantId && { variant_id: props.body.variantId }),
    ...(props.body.sellerId && { seller_id: props.body.sellerId }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  // Get shipment items with proper select
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: {
        shipment_id: props.shipmentId,
        orderItem: orderItemWhere,
      } satisfies Prisma.ecommerce_mall_shipment_itemsWhereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        order_item_id: true,
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
                description: true,
                base_price: true,
                created_at: true,
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
                seller: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    created_at: true,
                    deleted_at: true,
                  },
                } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
              },
            },
            variant: {
              select: {
                id: true,
                sku_code: true,
                price: true,
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
              },
            } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
          },
        },
      },
    });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_shipment_items.count({
    where: {
      shipment_id: props.shipmentId,
      orderItem: orderItemWhere,
    } satisfies Prisma.ecommerce_mall_shipment_itemsWhereInput,
  });
  // Fetch variant options separately
  const variantIds = shipmentItems
    .map((item) => item.orderItem.variant?.id)
    .filter((id): id is string => id !== undefined);
  const variantOptions =
    variantIds.length > 0
      ? await MyGlobal.prisma.ecommerce_mall_product_variant_options.findMany({
          where: {
            product_variant_id: { in: variantIds },
          },
          select: {
            id: true,
            product_variant_id: true,
            option_name: true,
            option_value: true,
          },
        })
      : [];
  const optionsByVariantId = new Map<string, typeof variantOptions>();
  for (const opt of variantOptions) {
    const list = optionsByVariantId.get(opt.product_variant_id) ?? [];
    list.push(opt);
    optionsByVariantId.set(opt.product_variant_id, list);
  }
  // Transform order items
  const transformedItems: IEcommerceMallOrderItem.ISummary[] =
    await ArrayUtil.asyncMap(shipmentItems, async (item) => {
      const orderItem = item.orderItem;
      const variantOptions_for_item = orderItem.variant
        ? (optionsByVariantId.get(orderItem.variant.id) ?? [])
        : [];
      return {
        id: orderItem.id,
        quantity: orderItem.quantity,
        priceAtPurchase: orderItem.price_at_purchase,
        status: orderItem.status as IEcommerceMallOrderItem.ISummary["status"],
        createdAt: toISOStringSafe(orderItem.created_at),
        product: {
          id: orderItem.product.id,
          name: orderItem.product.name,
          description: orderItem.product.description,
          basePrice: orderItem.product.base_price,
          thumbnailImage: null,
          priceRange: { minPrice: 0, maxPrice: 0 },
          category: {
            id: orderItem.product.category.id,
            name: orderItem.product.category.name,
            description: orderItem.product.category.description,
            parentId: orderItem.product.category.parent_id,
            parent: null,
            subcategoryCount: 0,
            createdAt: toISOStringSafe(orderItem.product.category.created_at),
            updatedAt: toISOStringSafe(orderItem.product.category.updated_at),
          } satisfies IEcommerceMallCategory.ISummary,
          seller: {
            id: orderItem.product.seller.id,
            email: orderItem.product.seller.email as string &
              tags.Format<"email">,
            approvalStatus: orderItem.product.seller
              .approval_status as IEcommerceMallSeller.ISummary["approvalStatus"],
            createdAt: toISOStringSafe(orderItem.product.seller.created_at),
            deletedAt: orderItem.product.seller.deleted_at
              ? toISOStringSafe(orderItem.product.seller.deleted_at)
              : null,
            registrationCount: 0,
            latestRegistrationStatus: null,
          } satisfies IEcommerceMallSeller.ISummary,
          averageRating: null,
          reviewCount: 0,
          availabilityStatus: "unavailable",
          createdAt: toISOStringSafe(orderItem.product.created_at),
        } satisfies IEcommerceMallProduct.ISummary,
        variant: {
          id: orderItem.variant!.id,
          skuCode: orderItem.variant!.sku_code,
          price: orderItem.variant!.price,
          options: variantOptions_for_item.map((opt) => ({
            id: opt.id,
            optionName: opt.option_name,
            optionValue: opt.option_value,
          })) satisfies IEcommerceMallProductVariantOption.ISummary[],
          createdAt: toISOStringSafe(orderItem.variant!.created_at),
          updatedAt: toISOStringSafe(orderItem.variant!.updated_at),
        } satisfies IEcommerceMallProductVariant.ISummary,
        seller: {
          id: orderItem.seller.id,
          email: orderItem.seller.email as string & tags.Format<"email">,
          approvalStatus: orderItem.seller
            .approval_status as IEcommerceMallSeller.ISummary["approvalStatus"],
          createdAt: toISOStringSafe(orderItem.seller.created_at),
          deletedAt: orderItem.seller.deleted_at
            ? toISOStringSafe(orderItem.seller.deleted_at)
            : null,
          registrationCount: 0,
          latestRegistrationStatus: null,
        } satisfies IEcommerceMallSeller.ISummary,
      } satisfies IEcommerceMallOrderItem.ISummary;
    });
  return {
    data: transformedItems,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
