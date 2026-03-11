import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
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

export async function patchEcommerceMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.IRequest;
}): Promise<IPageIEcommerceMallCartItem.ISummary> {
  // Verify cart exists and belongs to customer
  const cart =
    await MyGlobal.prisma.ecommerce_mall_shopping_carts.findUniqueOrThrow({
      where: {
        id: props.cartId,
        customer_id: props.customer.id,
      },
    });
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_mall_cart_itemsWhereInput = {
    cart_id: props.cartId,
    deleted_at: null,
    ...(props.body.minQuantity !== undefined && {
      quantity: {
        gte: props.body.minQuantity,
      },
    }),
    ...(props.body.maxQuantity !== undefined && {
      quantity: {
        lte: props.body.maxQuantity,
      },
    }),
    ...(props.body.addedSince !== undefined && {
      created_at: {
        gte: new Date(props.body.addedSince),
      },
    }),
    ...(props.body.addedUntil !== undefined && {
      created_at: {
        lte: new Date(props.body.addedUntil),
      },
    }),
    // Filter by variant option keys (JSONB contains any of the keys)
    ...(props.body.optionKeys !== undefined &&
      props.body.optionKeys.length > 0 && {
        variant: {
          option_values: {
            contains: props.body.optionKeys[0],
          },
        },
      }),
    // Filter by variant option values (JSONB containment)
    ...(props.body.optionValues !== undefined &&
      Object.keys(props.body.optionValues).length > 0 && {
        variant: {
          option_values: {
            equals:
              props.body.optionValues[Object.keys(props.body.optionValues)[0]],
          },
        },
      }),
  };
  // Build ORDER BY - use single field with direction
  const orderByDirection: "asc" | "desc" =
    props.body.sortOrder === "desc" ? "desc" : "asc";
  const orderByInput: Prisma.ecommerce_mall_cart_itemsOrderByWithRelationInput[] =
    [
      {
        [props.body.sortBy === "addedAt" || props.body.sortBy === undefined
          ? "created_at"
          : props.body.sortBy === "quantity"
            ? "quantity"
            : "price"]: orderByDirection,
      },
    ] satisfies Prisma.ecommerce_mall_cart_itemsOrderByWithRelationInput[];
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Query cart items with variant and product joins
  const data = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      quantity: true,
      price: true,
      created_at: true,
      variant: {
        select: {
          id: true,
          sku_code: true,
          option_values: true,
          price_override: true,
          stock_quantity: true,
          is_active: true,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
              is_active: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_cart_items.count({
    where: whereInput,
  });
  // Apply availability filter in application layer and transform
  const filteredData =
    props.body.available === true
      ? data.filter((item) => {
          const variantIsActive = item.variant.is_active;
          const productIsActive = item.variant.product.is_active;
          const hasStock = item.variant.stock_quantity >= item.quantity;
          return variantIsActive && productIsActive && hasStock;
        })
      : props.body.unavailable === true
        ? data.filter((item) => {
            const variantIsActive = item.variant.is_active;
            const productIsActive = item.variant.product.is_active;
            const hasStock = item.variant.stock_quantity >= item.quantity;
            return !variantIsActive || !productIsActive || !hasStock;
          })
        : data;
  const transformedData = (await ArrayUtil.asyncMap(
    filteredData,
    async (item) => {
      const variantIsActive = item.variant.is_active;
      const productIsActive = item.variant.product.is_active;
      const hasStock = item.variant.stock_quantity >= item.quantity;
      const availability =
        variantIsActive && productIsActive && hasStock
          ? "available"
          : "unavailable";
      return {
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        addedAt: toISOStringSafe(item.created_at),
        variant: {
          id: item.variant.id,
          skuCode: item.variant.sku_code,
          optionValues: item.variant.option_values,
          priceOverride: item.variant.price_override,
          stockQuantity: item.variant.stock_quantity,
          isActive: item.variant.is_active,
          product: {
            id: item.variant.product.id,
            name: item.variant.product.name,
            basePrice: item.variant.product.base_price,
            category: {
              id: "",
              name: "",
              isLeaf: false,
              createdAt: "",
              deletedAt: null,
            } satisfies IEcommerceMallCategory.ISummary,
            seller: {
              id: "",
              email: "",
              approvalStatus: "pending",
              rejectionReason: null,
              isSuspended: false,
              isBanned: false,
              createdAt: "",
              updatedAt: "",
            } satisfies IEcommerceMallSeller.ISummary,
            isActive: item.variant.product.is_active,
          } satisfies IEcommerceMallProduct.ISummary,
        } satisfies IEcommerceMallProductVariant.ISummary,
        availability,
      } satisfies IEcommerceMallCartItem.ISummary;
    },
  )) as IEcommerceMallCartItem.ISummary[];
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: filteredData.length,
      pages: Math.ceil(filteredData.length / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallCartItem.ISummary;
}
