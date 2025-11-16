import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Filtering
  const where: Record<string, unknown> = {
    shopping_mall_cart_id: props.cartId,
  };
  if (typeof props.body.sku_id === "string") {
    where["shopping_mall_product_sku_id"] = props.body.sku_id;
  }
  if (props.body.min_quantity !== undefined) {
    where["quantity"] = Object.assign(where["quantity"] || {}, {
      gte: props.body.min_quantity,
    });
  }
  if (props.body.max_quantity !== undefined) {
    where["quantity"] = Object.assign(where["quantity"] || {}, {
      lte: props.body.max_quantity,
    });
  }

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { updated_at: "desc" };
  if (props.body.sort_by) {
    orderBy = { [props.body.sort_by]: props.body.sort_order || "desc" };
  }

  // Confirm cart ownership
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (cart === null) {
    throw new HttpException(
      "Cart not found or not owned by the customer.",
      404,
    );
  }
  // Query the items and count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_items.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_cart_items.count({ where }),
  ]);

  // Gather SKU IDs
  const skuIds = Array.from(
    new Set(items.map((item) => item.shopping_mall_product_sku_id)),
  );
  let skuMap: Record<string, IShoppingMallProductSku.ISummary> = {};
  if (skuIds.length > 0) {
    const skus = await MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where: { id: { in: skuIds } },
      select: {
        id: true,
        sku_code: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_product_id: true,
        price: true,
        stock: true,
      },
    });
    skuMap = skus.reduce(
      (acc, sku) => {
        acc[sku.id] = {
          id: sku.id,
          code: sku.sku_code ?? "",
          product_title: "", // Not available, fallback to empty string
          option_summary: "", // Not available, fallback to empty string
          in_stock: sku.status === "enabled" && sku.stock > 0,
        };
        return acc;
      },
      {} as Record<string, IShoppingMallProductSku.ISummary>,
    );
  }

  const data = items.map((item) => ({
    id: item.id,
    shopping_mall_cart_id: item.shopping_mall_cart_id,
    sku: skuMap[item.shopping_mall_product_sku_id] ?? {
      id: item.shopping_mall_product_sku_id,
      code: "",
      product_title: "",
      option_summary: "",
      in_stock: false,
    },
    quantity: item.quantity,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: limit === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
