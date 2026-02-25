import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const orderDirection = props.body.order ?? "desc";
  const sortField = props.body.sort ?? "created_at";
  const orderByInput = (
    sortField === "created_at"
      ? { created_at: orderDirection }
      : sortField === "unit_price"
        ? { unit_price: orderDirection }
        : { quantity: orderDirection }
  ) satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput;
  const whereInput = {
    shopping_customer_id: props.customer.id,
    ...(props.body.min_price !== undefined && {
      unit_price: { gte: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      unit_price: { lte: props.body.max_price },
    }),
    ...(props.body.search !== undefined && {
      variant: {
        product: {
          name: { contains: props.body.search, mode: "insensitive" as const },
        },
      },
    }),
  } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      quantity: true,
      unit_price: true,
      created_at: true,
      updated_at: true,
      variant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          deleted_at: true,
          options: {
            select: { key: true, value: true },
          } satisfies Prisma.shopping_mall_product_variant_optionsFindManyArgs,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              deleted_at: true,
              created_at: true,
              seller: {
                select: {
                  id: true,
                  email: true,
                  shop_name: true,
                  shop_description: true,
                  logo_url: true,
                  approval_status: true,
                  rejection_reason: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
              variants: {
                select: { price: true },
              } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
              images: {
                select: { url: true },
                orderBy: { order: "asc" as const },
              } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
              reviews: {
                select: { rating: true },
              } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
            },
          },
          inventoryHistories: {
            select: { quantity_change: true },
          } satisfies Prisma.shopping_mall_product_inventory_historiesFindManyArgs,
        },
      } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where: whereInput,
  });
  const transformed = await ArrayUtil.asyncMap(
    cartItems,
    async (item): Promise<IShoppingMallCartItem.ISummary> => {
      const stock_quantity: number = item.variant.inventoryHistories.reduce(
        (sum, h) => sum + h.quantity_change,
        0,
      );
      const isDeleted =
        item.variant.deleted_at !== null ||
        item.variant.product.deleted_at !== null;
      const availability_status:
        | "available"
        | "unavailable"
        | "insufficient_stock" = isDeleted
        ? "unavailable"
        : stock_quantity < item.quantity
          ? "insufficient_stock"
          : "available";
      const variantPrices = item.variant.product.variants.map(
        (v) => v.price ?? item.variant.product.base_price,
      );
      const minPrice =
        variantPrices.length > 0
          ? Math.min(...variantPrices)
          : item.variant.product.base_price;
      const maxPrice =
        variantPrices.length > 0
          ? Math.max(...variantPrices)
          : item.variant.product.base_price;
      const activeReviews = item.variant.product.reviews;
      const averageRating =
        activeReviews.length > 0
          ? activeReviews.reduce((sum, r) => sum + r.rating, 0) /
            activeReviews.length
          : null;
      const mainImageUrl =
        item.variant.product.images.length > 0
          ? item.variant.product.images[0].url
          : undefined;
      const product: IShoppingMallProduct.ISummary = {
        id: item.variant.product.id,
        name: item.variant.product.name,
        base_price: item.variant.product.base_price,
        min_price: variantPrices.length > 0 ? minPrice : undefined,
        max_price: variantPrices.length > 0 ? maxPrice : undefined,
        main_image_url: mainImageUrl,
        seller: {
          id: item.variant.product.seller.id,
          email: item.variant.product.seller.email,
          shopName: item.variant.product.seller.shop_name,
          shopDescription:
            item.variant.product.seller.shop_description ?? undefined,
          logoUrl: item.variant.product.seller.logo_url ?? undefined,
          approvalStatus: item.variant.product.seller.approval_status,
          rejectionReason:
            item.variant.product.seller.rejection_reason ?? undefined,
          createdAt: item.variant.product.seller.created_at.toISOString(),
          deletedAt:
            item.variant.product.seller.deleted_at?.toISOString() ?? null,
        } satisfies IShoppingMallSeller.ISummary,
        average_rating: averageRating,
        review_count: activeReviews.length,
        created_at: item.variant.product.created_at.toISOString(),
      } satisfies IShoppingMallProduct.ISummary;
      const variant: IShoppingMallProductVariant.ISummary = {
        id: item.variant.id,
        sku_code: item.variant.sku_code,
        price: item.variant.price,
        options: item.variant.options.map((opt) => ({
          key: opt.key,
          value: opt.value,
        })),
        stock_quantity,
        in_stock: stock_quantity > 0,
      } satisfies IShoppingMallProductVariant.ISummary;
      return {
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
        variant,
        availability_status,
        current_stock: stock_quantity,
        product,
        seller: product.seller!,
        subtotal: item.unit_price * item.quantity,
      } satisfies IShoppingMallCartItem.ISummary;
    },
  );
  const filtered = transformed.filter((item) => {
    if (
      props.body.availability_status !== undefined &&
      props.body.availability_status !== "all"
    ) {
      if (item.availability_status !== props.body.availability_status)
        return false;
    }
    if (
      props.body.stock_status !== undefined &&
      props.body.stock_status !== "all"
    ) {
      const stockMatch =
        (props.body.stock_status === "in_stock" &&
          item.current_stock >= item.quantity) ||
        (props.body.stock_status === "out_of_stock" &&
          item.current_stock === 0) ||
        (props.body.stock_status === "insufficient_stock" &&
          item.current_stock > 0 &&
          item.current_stock < item.quantity);
      if (!stockMatch) return false;
    }
    return true;
  });
  return {
    data: filtered,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallCartItem.ISummary;
}
