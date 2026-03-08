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

export async function patchEcommerceMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.IRequest;
}): Promise<IPageIEcommerceMallCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get customer's cart IDs
  const carts = await MyGlobal.prisma.ecommerce_mall_shopping_carts.findMany({
    where: { customer_id: props.customer.id },
    select: { id: true },
  });
  const cartIds = carts.map((c) => c.id);
  if (cartIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Build query filters - availability is computed client-side, not filtered server-side
  const whereInput: Prisma.ecommerce_mall_cart_itemsWhereInput = {
    cart_id: { in: cartIds },
    deleted_at: null,
    ...(props.body.variantAddedSince && {
      created_at: { gte: props.body.variantAddedSince },
    }),
    ...(props.body.variantAddedBefore && {
      created_at: { lt: props.body.variantAddedBefore },
    }),
    ...(props.body.cartId && { cart_id: props.body.cartId }),
  };
  // Determine order by
  const orderByInput =
    props.body.sortOrder === "createdAt_asc"
      ? { created_at: "asc" as const }
      : props.body.sortOrder === "createdAt_desc"
        ? { created_at: "desc" as const }
        : props.body.sortOrder === "price_asc"
          ? { price: "asc" as const }
          : props.body.sortOrder === "price_desc"
            ? { price: "desc" as const }
            : { created_at: "desc" as const };
  // Query cart items with variant data
  const [items, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [orderByInput],
      include: {
        variant: {
          include: {
            product: {
              include: {
                seller: true,
                category: {
                  include: { parent: true },
                },
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_cart_items.count({ where: whereInput }),
  ]);
  // Transform items with computed availability
  const data = await ArrayUtil.asyncMap(items, async (item) => {
    const variant = item.variant;
    const stockQuantity = variant.stock_quantity;
    const quantity = item.quantity;
    // Calculate availability based on stock vs quantity
    let availability: "available" | "low_stock" | "out_of_stock";
    if (stockQuantity === 0) {
      availability = "out_of_stock";
    } else if (stockQuantity < quantity) {
      availability = "low_stock";
    } else {
      availability = "available";
    }
    const priceOverride = variant.price_override;
    return {
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      variant: {
        id: variant.id,
        skuCode: variant.sku_code,
        product: {
          id: variant.product.id,
          name: variant.product.name,
          description: variant.product.description,
          base_price: variant.product.base_price,
          is_active: variant.product.is_active,
          created_at: variant.product.created_at.toISOString(),
          seller: {
            id: variant.product.seller.id,
            email: variant.product.seller.email,
            approval_status: typia.assert<"pending" | "approved" | "rejected">(
              variant.product.seller.approval_status,
            ),
            rejection_reason: variant.product.seller.rejection_reason,
            is_suspended: variant.product.seller.is_suspended,
            is_banned: variant.product.seller.is_banned,
            created_at: variant.product.seller.created_at.toISOString(),
          },
          category: {
            id: variant.product.category.id,
            name: variant.product.category.name,
            is_leaf: variant.product.category.is_leaf,
            parent: variant.product.category.parent
              ? {
                  id: variant.product.category.parent.id,
                  name: variant.product.category.parent.name,
                  is_leaf: variant.product.category.parent.is_leaf,
                  created_at:
                    variant.product.category.parent.created_at.toISOString(),
                  updated_at:
                    variant.product.category.parent.updated_at.toISOString(),
                  deleted_at:
                    variant.product.category.parent.deleted_at?.toISOString() ??
                    null,
                }
              : null,
            created_at: variant.product.category.created_at.toISOString(),
            updated_at: variant.product.category.updated_at.toISOString(),
            deleted_at:
              variant.product.category.deleted_at?.toISOString() ?? null,
          },
        },
        stockQuantity: stockQuantity,
        isActive: variant.is_active,
        priceOverride: priceOverride ?? null,
        displayPrice: priceOverride ?? variant.product.base_price,
      } satisfies IEcommerceMallProductVariant.ISummary,
      availability,
    } satisfies IEcommerceMallCartItem.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
