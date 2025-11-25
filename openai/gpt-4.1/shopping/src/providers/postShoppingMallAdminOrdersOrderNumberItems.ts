import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderNumberItems(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const now = toISOStringSafe(new Date());
  // Begin transaction
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    // 1. Lookup order (by business order number, active only)
    const order = await prisma.shopping_mall_orders.findFirst({
      where: {
        order_number: props.orderNumber,
        deleted_at: null,
      },
    });
    if (!order) {
      throw new HttpException("Order not found or has been deleted.", 404);
    }
    // 2. Lookup product (active)
    const product = await prisma.shopping_mall_products.findFirst({
      where: {
        id: props.body.shopping_mall_product_id,
        deleted_at: null,
      },
    });
    if (!product) {
      throw new HttpException("Product not found or has been deleted.", 404);
    }
    // 3. Lookup SKU (active) and verify it's for this product
    const sku = await prisma.shopping_mall_product_skus.findFirst({
      where: {
        id: props.body.shopping_mall_product_sku_id,
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        deleted_at: null,
        status: "active",
      },
    });
    if (!sku) {
      throw new HttpException(
        "SKU not found, not active, or does not belong to the product.",
        404,
      );
    }
    // 4. Check SKU stock
    if (sku.stock < props.body.quantity) {
      throw new HttpException(
        "Insufficient SKU stock for requested quantity.",
        400,
      );
    }
    // 5. Ensure no duplicate item for this order+SKU
    const existingItem = await prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_id: order.id,
        shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
        deleted_at: null,
      },
    });
    if (existingItem) {
      throw new HttpException("This SKU is already present in the order.", 409);
    }
    // 6. Insert new order item
    const orderItemId = v4();
    const createdItem = await prisma.shopping_mall_order_items.create({
      data: {
        id: orderItemId,
        shopping_mall_order_id: order.id,
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        shopping_mall_product_sku_id: props.body.shopping_mall_product_sku_id,
        quantity: props.body.quantity,
        unit_price: props.body.unit_price,
        subtotal: props.body.subtotal,
        currency: props.body.currency,
        delivered: props.body.delivered,
        refunded: props.body.refunded,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // 7. Decrement SKU stock
    await prisma.shopping_mall_product_skus.update({
      where: { id: sku.id },
      data: { stock: sku.stock - props.body.quantity, updated_at: now },
    });
    // 8. Compose response
    // -- Product summary
    const seller = await prisma.shopping_mall_sellers.findFirst({
      where: { id: product.shopping_mall_seller_id },
    });
    const categoriesJoin =
      await prisma.shopping_mall_products_categories.findMany({
        where: { shopping_mall_product_id: product.id },
      });
    const categoryIds = categoriesJoin.map((c) => c.shopping_mall_category_id);
    const categories =
      categoryIds.length > 0
        ? await prisma.shopping_mall_categories.findMany({
            where: { id: { in: categoryIds } },
          })
        : [];
    const categoriesSummary = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
    }));
    // -- SKU summary
    const skuSummary = {
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary: "", // TODO: Option summary construction if applicable
      in_stock: sku.stock - props.body.quantity > 0,
    };
    // -- Product summary
    const prodSummary = {
      id: product.id,
      title: product.title,
      default_price: product.default_price,
      business_status: product.business_status,
      seller: seller
        ? { id: seller.id, business_name: seller.business_name }
        : { id: product.shopping_mall_seller_id, business_name: "" },
      categories: categoriesSummary,
      created_at: toISOStringSafe(product.created_at),
    };
    // -- Order summary
    const orderSummary = {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
    };
    return {
      id: createdItem.id,
      order: orderSummary,
      product: prodSummary,
      sku: skuSummary,
      quantity: createdItem.quantity,
      unit_price: createdItem.unit_price,
      subtotal: createdItem.subtotal,
      currency: createdItem.currency,
      delivered: createdItem.delivered,
      refunded: createdItem.refunded,
      created_at: toISOStringSafe(createdItem.created_at),
      updated_at: toISOStringSafe(createdItem.updated_at),
      deleted_at: createdItem.deleted_at
        ? toISOStringSafe(createdItem.deleted_at)
        : null,
    };
  });
}
