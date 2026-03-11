import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShoppingCart";
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

export async function patchEcommerceMallCustomerCartSummary(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShoppingCart.IRequest;
}): Promise<IPageIEcommerceMallShoppingCart.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "updated_at";
  const sortOrder = props.body.sortOrder ?? "DESC";
  const filterByStatus = props.body.filterByStatus;
  const statusFilter = props.body.status;
  // Validate pagination parameters
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const validSortFields = [
    "quantity",
    "price",
    "updated_at",
    "item_count",
  ] as const;
  if (!validSortFields.includes(sortBy as (typeof validSortFields)[number])) {
    throw new HttpException("Invalid sort field", 400);
  }
  if (sortOrder !== "ASC" && sortOrder !== "DESC") {
    throw new HttpException("Invalid sort order", 400);
  }
  // Check if cart exists for customer
  const cart = await MyGlobal.prisma.ecommerce_mall_shopping_carts.findFirst({
    where: {
      customer_id: props.customer.id,
    },
  });
  // Return empty cart if no cart exists
  if (!cart) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIEcommerceMallShoppingCart.ISummary;
  }
  // Query cart items with all related data
  const cartItemsQuery = await MyGlobal.prisma.$queryRawUnsafe<
    Array<{
      item_id: string;
      quantity: number;
      price: number;
      created_at: string;
      updated_at: string;
      variant_id: string;
      sku_code: string;
      option_values: string;
      price_override: number | null;
      stock_quantity: number;
      variant_is_active: boolean;
      product_id: string;
      product_name: string;
      product_base_price: number;
      product_is_active: boolean;
      category_id: string;
      category_name: string;
      category_description: string | null;
      category_parent_id: string | null;
      category_is_leaf: boolean;
      category_created_at: string;
      category_deleted_at: string | null;
      seller_id: string;
      seller_email: string;
      seller_approval_status: string;
      seller_rejection_reason: string | null;
      seller_is_suspended: boolean;
      seller_is_banned: boolean;
      seller_created_at: string;
      seller_updated_at: string;
    }>
  >(`SELECT
      ci.id as item_id,
      ci.quantity,
      ci.price,
      ci.created_at,
      ci.updated_at,
      pv.id as variant_id,
      pv.sku_code,
      pv.option_values,
      pv.price_override,
      pv.stock_quantity,
      pv.is_active as variant_is_active,
      p.id as product_id,
      p.name as product_name,
      p.base_price as product_base_price,
      p.is_active as product_is_active,
      c.id as category_id,
      c.name as category_name,
      c.description as category_description,
      c.parent_id as category_parent_id,
      c.is_leaf as category_is_leaf,
      c.created_at as category_created_at,
      c.deleted_at as category_deleted_at,
      s.id as seller_id,
      s.email as seller_email,
      s.approval_status as seller_approval_status,
      s.rejection_reason as seller_rejection_reason,
      s.is_suspended as seller_is_suspended,
      s.is_banned as seller_is_banned,
      s.created_at as seller_created_at,
      s.updated_at as seller_updated_at
    FROM ecommerce_mall_cart_items ci
    INNER JOIN ecommerce_mall_product_variants pv ON ci.variant_id = pv.id
    INNER JOIN ecommerce_mall_products p ON pv.product_id = p.id
    INNER JOIN ecommerce_mall_categories c ON p.category_id = c.id
    INNER JOIN ecommerce_mall_sellers s ON p.seller_id = s.id
    WHERE ci.cart_id = ${cart.id}
      AND ci.deleted_at IS NULL`);
  // Build availability status for each item
  const itemsWithAvailability = cartItemsQuery.map((item) => ({
    ...item,
    availability:
      item.stock_quantity > 0 &&
      item.variant_is_active &&
      item.product_is_active
        ? "available"
        : "unavailable",
  }));
  // Apply filters
  let filteredItems = itemsWithAvailability;
  if (filterByStatus === true) {
    // Exclude unavailable items
    filteredItems = itemsWithAvailability.filter(
      (item) => item.availability === "available",
    );
  } else if (statusFilter === "available") {
    // Only available items
    filteredItems = itemsWithAvailability.filter(
      (item) => item.availability === "available",
    );
  } else if (statusFilter === "unavailable") {
    // Only unavailable items
    filteredItems = itemsWithAvailability.filter(
      (item) => item.availability === "unavailable",
    );
  }
  // Apply sorting using string comparison for dates (no Date type)
  const sortMultiplier = sortOrder === "ASC" ? 1 : -1;
  filteredItems.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "quantity":
        comparison = a.quantity - b.quantity;
        break;
      case "price":
        comparison = a.price - b.price;
        break;
      case "updated_at":
        // Compare ISO strings directly (lexicographic comparison works for ISO dates)
        comparison = a.updated_at.localeCompare(b.updated_at);
        break;
      case "item_count":
        comparison = a.quantity - b.quantity;
        break;
    }
    return comparison * sortMultiplier;
  });
  // Apply pagination
  const paginatedItems = filteredItems.slice(skip, skip + limit);
  // Calculate total
  const total = filteredItems.length;
  // Group items by seller and calculate seller subtotals
  const sellerMap = new Map<
    string,
    {
      seller: IEcommerceMallSeller.ISummary;
      itemCount: number;
      subtotal: number;
      total: number;
    }
  >();
  paginatedItems.forEach((item) => {
    const itemSubtotal = item.quantity * item.price;
    const itemTotal = itemSubtotal * 1.1; // 10% tax
    if (!sellerMap.has(item.seller_id)) {
      sellerMap.set(item.seller_id, {
        seller: {
          id: item.seller_id,
          email: item.seller_email,
          approvalStatus: item.seller_approval_status as
            | "pending"
            | "approved"
            | "rejected",
          rejectionReason: item.seller_rejection_reason,
          isSuspended: item.seller_is_suspended,
          isBanned: item.seller_is_banned,
          createdAt: item.seller_created_at,
          updatedAt: item.seller_updated_at,
        } satisfies IEcommerceMallSeller.ISummary,
        itemCount: 0,
        subtotal: 0,
        total: 0,
      });
    }
    const sellerData = sellerMap.get(item.seller_id)!;
    sellerData.itemCount += item.quantity;
    sellerData.subtotal += itemSubtotal;
    sellerData.total += itemTotal;
  });
  const sellerSubtotals = Array.from(sellerMap.values()).map((s) => ({
    ...s,
    subtotal: s.subtotal,
    total: s.total,
  })) as Array<IEcommerceMallShoppingCart.ISellerSubtotal>;
  // Calculate cart totals
  const cartItemCount = filteredItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const cartSubtotal = filteredItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const cartTax = cartSubtotal * 0.1;
  const cartTotal = cartSubtotal * 1.1;
  // Build cart items
  const cartItems = paginatedItems.map((item) => ({
    id: item.item_id,
    quantity: item.quantity as number & tags.Type<"int32">,
    price: item.price,
    addedAt: item.created_at,
    variant: {
      id: item.variant_id,
      skuCode: item.sku_code,
      optionValues: item.option_values,
      priceOverride: item.price_override,
      stockQuantity: item.stock_quantity as number & tags.Type<"int32">,
      isActive: item.variant_is_active,
      product: {
        id: item.product_id,
        name: item.product_name,
        basePrice: item.product_base_price,
        category: {
          id: item.category_id,
          name: item.category_name,
          description: item.category_description ?? undefined,
          parent: null,
          isLeaf: item.category_is_leaf,
          createdAt: item.category_created_at,
          deletedAt: item.category_deleted_at,
        } satisfies IEcommerceMallCategory.ISummary,
        seller: {
          id: item.seller_id,
          email: item.seller_email,
          approvalStatus: item.seller_approval_status as
            | "pending"
            | "approved"
            | "rejected",
          rejectionReason: item.seller_rejection_reason,
          isSuspended: item.seller_is_suspended,
          isBanned: item.seller_is_banned,
          createdAt: item.seller_created_at,
          updatedAt: item.seller_updated_at,
        } satisfies IEcommerceMallSeller.ISummary,
        isActive: item.product_is_active,
      } satisfies IEcommerceMallProduct.ISummary,
    } satisfies IEcommerceMallProductVariant.ISummary,
    availability: item.availability,
  })) as IEcommerceMallCartItem.ISummary[];
  // Build cart summary
  const cartSummary = {
    id: cart.id,
    customerId: props.customer.id,
    createdAt: toISOStringSafe(cart.created_at),
    updatedAt: toISOStringSafe(cart.updated_at),
    itemCount: cartItemCount as number & tags.Type<"int32"> & tags.Minimum<0>,
    subtotal: cartSubtotal,
    tax: cartTax,
    total: cartTotal,
    sellerSubtotals: filteredItems.length > 0 ? sellerSubtotals : undefined,
    cartItems,
  } satisfies IEcommerceMallShoppingCart.ISummary;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: [cartSummary],
  } satisfies IPageIEcommerceMallShoppingCart.ISummary;
}
