import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function getShoppingMallProductRatingsProductRatingId(props: {
  productRatingId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductRating> {
  const record = await MyGlobal.prisma.shopping_mall_product_ratings.findUnique(
    {
      where: { id: props.productRatingId },
    },
  );
  if (!record) {
    throw new HttpException("Product rating not found", 404);
  }

  // Fetch related entities based on foreign keys
  const [customer, session, product, productSku, order] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: record.shopping_mall_customer_id },
    }),
    MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: record.shopping_mall_customer_session_id },
    }),
    MyGlobal.prisma.shopping_mall_products.findUnique({
      where: { id: record.shopping_mall_product_id },
      include: { seller: true },
    }),
    MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: record.shopping_mall_product_sku_id },
    }),
    MyGlobal.prisma.shopping_mall_orders.findUnique({
      where: { id: record.shopping_mall_order_id },
    }),
  ]);

  if (!customer || !session || !product || !productSku || !order) {
    throw new HttpException("Related data not found", 404);
  }

  // Fetch categories for the product via join table
  const productCategories =
    await MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: { shopping_mall_product_id: record.shopping_mall_product_id },
      include: { category: true },
    });
  const categories = productCategories.map((pc) => ({
    id: pc.category.id,
    name: pc.category.name,
  }));

  return {
    id: record.id,
    customer: {
      id: customer.id,
      name: customer.name,
    },
    session: {
      id: session.id,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : toISOStringSafe(session.created_at),
      last_active_at: toISOStringSafe(session.created_at),
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      user_agent: "",
    },
    product: {
      id: product.id,
      title: product.title,
      default_price: product.default_price,
      business_status: product.business_status,
      seller: {
        id: product.seller.id,
        business_name: product.seller.business_name,
      },
      categories,
      created_at: toISOStringSafe(product.created_at),
    },
    productSku: {
      id: productSku.id,
      code: productSku.sku_code,
      product_title: product.title,
      option_summary: "",
      in_stock:
        typeof productSku.stock === "number" ? productSku.stock > 0 : false,
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
    },
    order_item_id: record.shopping_mall_order_item_id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    shopping_mall_customer_session_id: record.shopping_mall_customer_session_id,
    shopping_mall_product_id: record.shopping_mall_product_id,
    shopping_mall_product_sku_id: record.shopping_mall_product_sku_id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    shopping_mall_order_item_id: record.shopping_mall_order_item_id,
    value: record.value,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
