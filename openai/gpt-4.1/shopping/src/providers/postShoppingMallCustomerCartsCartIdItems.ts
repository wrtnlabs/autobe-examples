import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // 1. Validate cart existence and ownership
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (!cart || cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Cart does not exist or you do not own this cart.",
      403,
    );
  }

  // 2. Validate SKU existence and status
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: props.body.shopping_mall_product_sku_id,
      deleted_at: null,
    },
    select: {
      id: true,
      sku_code: true,
      stock: true,
      status: true,
      shopping_mall_product_id: true,
    },
  });
  if (!sku) {
    throw new HttpException("Product SKU not found.", 404);
  }
  if (sku.status !== "active") {
    throw new HttpException("SKU is not available for sale.", 409);
  }
  if (sku.stock < props.body.quantity) {
    throw new HttpException(
      "Requested quantity cannot exceed SKU inventory.",
      409,
    );
  }

  // 3. Enforce unique SKU per cart constraint
  const duplicate = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: {
      shopping_mall_cart_id_shopping_mall_product_sku_id: {
        shopping_mall_cart_id: props.cartId,
        shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
      },
    },
  });
  if (duplicate) {
    throw new HttpException(
      "This SKU already exists in the cart. Use update instead.",
      409,
    );
  }

  // 4. Create cart item with proper datetime and uuid formatting
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  ) as string & tags.Format<"date-time">;
  const cartItemId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id: cartItemId,
      shopping_mall_cart_id: props.cartId,
      shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
      quantity: props.body.quantity,
      created_at: now,
      updated_at: now,
    },
  });

  // 5. Query the product title for the summary
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: sku.shopping_mall_product_id },
    select: { title: true },
  });
  if (!product) {
    throw new HttpException("Product not found for SKU.", 500);
  }

  // Assemble productSku summary
  const productSkuSummary = {
    id: sku.id,
    code: sku.sku_code,
    product_title: product.title,
    option_summary: sku.sku_code,
    in_stock: sku.stock > 0 && sku.status === "active",
  };

  return {
    id: created.id,
    shopping_mall_cart_id: created.shopping_mall_cart_id,
    quantity: created.quantity,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    productSku: productSkuSummary,
  };
}
