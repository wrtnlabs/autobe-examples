import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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

export async function patchEcommerceMallSellerOrdersOrderIdItems(props: {
  seller: SellerPayload;
  orderId: string;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify order exists
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const baseWhere: Prisma.ecommerce_mall_order_itemsWhereInput = {
    order_id: props.orderId,
    seller_id: props.seller.id,
    deleted_at: null,
  };
  if (props.body.status !== undefined) {
    baseWhere.status = props.body.status;
  }
  if (props.body.variantId !== undefined) {
    baseWhere.variant_id = props.body.variantId;
  }
  if (props.body.productId !== undefined) {
    baseWhere.product_id = props.body.productId;
  }
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    baseWhere.created_at = {
      ...(props.body.createdAtFrom !== undefined && {
        gte: new Date(props.body.createdAtFrom),
      }),
      ...(props.body.createdAtTo !== undefined && {
        lte: new Date(props.body.createdAtTo),
      }),
    };
  }
  if (props.body.search !== undefined) {
    baseWhere.product = {
      name: { contains: props.body.search, mode: Prisma.QueryMode.insensitive },
    };
  }
  const whereInput =
    baseWhere satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  // Determine sort order
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    };
  // Fetch order items with related data
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
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
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              parent_id: true,
              created_at: true,
            },
          },
          images: {
            where: { deleted_at: null },
            orderBy: { display_order: "asc" },
            take: 1,
            select: {
              id: true,
              image_url: true,
              display_order: true,
            },
          },
        },
      },
      variant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          created_at: true,
          variantOptions: {
            select: {
              id: true,
              option_name: true,
              option_value: true,
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
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  // Transform to ISummary format
  const data: IEcommerceMallOrderItem.ISummary[] = orderItems.map((item) => {
    const variantPrice = item.variant.price;
    const basePrice = item.product.base_price;
    const effectivePrice = variantPrice ?? basePrice;
    const thumbnail: IEcommerceMallProductImage.ISummary | null =
      item.product.images.length > 0
        ? {
            id: item.product.images[0].id,
            imageUrl: item.product.images[0].image_url,
            displayOrder: item.product.images[0].display_order,
          }
        : null;
    const categorySummary: IEcommerceMallCategory.ISummary = {
      id: item.product.category.id,
      name: item.product.category.name,
      description: item.product.category.description,
      createdAt: toISOStringSafe(item.product.category.created_at),
      parent: item.product.category.parent_id
        ? { id: item.product.category.parent_id }
        : null,
    };
    const sellerSummary: IEcommerceMallSeller.ISummary = {
      id: item.seller.id,
      email: item.seller.email,
      shopName: "",
      approvalStatus: item.seller.approval_status,
      createdAt: toISOStringSafe(item.seller.created_at),
      updatedAt: toISOStringSafe(item.seller.updated_at),
      deletedAt: item.seller.deleted_at
        ? toISOStringSafe(item.seller.deleted_at)
        : null,
    };
    const productSummary: IEcommerceMallProduct.ISummary = {
      id: item.product.id,
      name: item.product.name,
      thumbnail,
      priceRangeMin: effectivePrice,
      priceRangeMax: effectivePrice,
      seller: sellerSummary,
      category: categorySummary,
      averageRating: null,
      reviewCount: 0,
      isAvailable: true,
    };
    const variantOptions: IEcommerceMallProductVariantOption.ISummary[] =
      item.variant.variantOptions.map((opt) => ({
        id: opt.id,
        optionName: opt.option_name,
        optionValue: opt.option_value,
      }));
    const variantSummary: IEcommerceMallProductVariant.ISummary = {
      id: item.variant.id,
      skuCode: item.variant.sku_code,
      price: item.variant.price,
      options: variantOptions,
      currentStock: 0,
      isAvailable: true,
      createdAt: toISOStringSafe(item.variant.created_at),
    };
    const orderItemSummary: IEcommerceMallOrderItem.ISummary = {
      id: item.id,
      quantity: item.quantity,
      priceAtPurchase: item.price_at_purchase,
      status: typia.assert<
        "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
      >(item.status),
      createdAt: toISOStringSafe(item.created_at),
      product: productSummary,
      variant: variantSummary,
      seller: sellerSummary,
    };
    return orderItemSummary;
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const result: IPageIEcommerceMallOrderItem.ISummary = {
    data,
    pagination,
  };
  return result;
}
