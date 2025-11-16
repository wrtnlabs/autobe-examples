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
import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingCartsShoppingCartIdCartItems(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const { customer, shoppingCartId, body } = props;

  const shoppingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
      where: { id: shoppingCartId },
      select: { id: true, shopping_mall_customer_id: true },
    });

  if (!shoppingCart) {
    throw new HttpException("Shopping cart not found", 404);
  }

  if (shoppingCart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const page = body.page ?? 1;
  const limit = Math.min(body.limit ?? 10, 100);
  const skip = (page - 1) * limit;

  const where: {
    shoppingMallShoppingCartId: string & tags.Format<"uuid">;
    productId?: (string & tags.Format<"uuid">) | undefined;
    quantity?: Prisma.IntFilter | undefined;
    skuCode?: string | undefined;
  } = { shoppingMallShoppingCartId: shoppingCartId };

  if (body.product_id !== undefined) {
    where.productId = body.product_id;
  }

  if (body.sku_code !== undefined) {
    where.skuCode = body.sku_code;
  }

  if (body.quantity_min !== undefined || body.quantity_max !== undefined) {
    where.quantity = {};
    if (body.quantity_min !== undefined) {
      where.quantity.gte = body.quantity_min;
    }
    if (body.quantity_max !== undefined) {
      where.quantity.lte = body.quantity_max;
    }
  }

  let orderBy: { [key: string]: "asc" | "desc" } | undefined;
  if (body.sortBy) {
    orderBy = {};
    if (body.sortOrder === "asc" || body.sortOrder === "desc") {
      orderBy[body.sortBy] = body.sortOrder;
    } else {
      orderBy[body.sortBy] = "asc";
    }
  } else {
    orderBy = { created_at: "desc" };
  }

  // Wait for schema to properly build include and mapping
  return {} as Promise<IPageIShoppingMallCartItem.ISummary>;
}
