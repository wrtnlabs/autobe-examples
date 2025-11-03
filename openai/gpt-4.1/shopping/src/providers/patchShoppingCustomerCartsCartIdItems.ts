import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCartItem";
import { IPageIShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingCartItem.IRequest;
}): Promise<IPageIShoppingCartItem.ISummary> {
  // 1. Check that cart exists and belongs to customer
  const cart = await MyGlobal.prisma.shopping_carts.findUnique({
    where: { id: props.cartId },
    select: { id: true, shopping_customer_id: true },
  });
  if (!cart || cart.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Cart not found or access denied", 404);
  }
  // 2. Pagination: default page=1, limit=20, clamp limit to [1,100]
  const page =
    props.body.page !== undefined && props.body.page > 0 ? props.body.page : 1;
  let limit =
    props.body.limit !== undefined && props.body.limit > 0
      ? props.body.limit
      : 20;
  limit = limit > 100 ? 100 : limit;
  // 3. Allowed sorts
  const allowedSort = ["added_at", "quantity", "sku_code"];
  const sortBy = allowedSort.includes(props.body.sort_by ?? "")
    ? props.body.sort_by!
    : "added_at";
  const sortOrder: "asc" | "desc" = props.body.order === "asc" ? "asc" : "desc";
  // 4. Build where clause: cart id, quantity filters
  const where: Record<string, unknown> = {
    shopping_cart_id: props.cartId,
  };
  if (props.body.min_quantity !== undefined) {
    where["quantity"] = Object.assign(where["quantity"] ?? {}, {
      gte: props.body.min_quantity,
    });
  }
  if (props.body.max_quantity !== undefined) {
    where["quantity"] = Object.assign(where["quantity"] ?? {}, {
      lte: props.body.max_quantity,
    });
  }
  // 5. Query items and count
  // If sortBy is 'sku_code', Prisma cannot sort cart_items by joined sku_code directly. So, sort in-memory after fetch.
  const [itemsRaw, total] = await Promise.all([
    MyGlobal.prisma.shopping_cart_items.findMany({
      where: where,
      include: { sku: true },
      ...(sortBy !== "sku_code" ? { orderBy: { [sortBy]: sortOrder } } : {}),
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_cart_items.count({ where: where }),
  ]);
  // 6. Filter by sku_code if requested
  const items =
    props.body.sku_code !== undefined
      ? itemsRaw.filter((item) => item.sku?.sku_code === props.body.sku_code)
      : itemsRaw;
  // 7. If in-memory sort needed for sku_code
  const sortedItems =
    sortBy === "sku_code"
      ? [...items].sort((a, b) => {
          if (!a.sku || !b.sku) return 0;
          if (a.sku.sku_code === b.sku.sku_code) return 0;
          return (
            (a.sku.sku_code < b.sku.sku_code ? -1 : 1) *
            (sortOrder === "asc" ? 1 : -1)
          );
        })
      : items;
  // 8. Map to ISummary
  const data = sortedItems.map((item) => ({
    id: item.id,
    sku: {
      id: item.sku.id,
      sku_code: item.sku.sku_code,
      price: item.sku.price,
      is_active: item.sku.is_active,
      status: item.sku.status,
    },
    quantity: item.quantity,
    added_at: toISOStringSafe(item.added_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));
  // 9. Calculate pages
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
