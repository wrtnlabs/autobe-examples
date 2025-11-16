import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerProductRatingsProductRatingId(props: {
  customer: CustomerPayload;
  productRatingId: string & tags.Format<"uuid">;
  body: IShoppingMallProductRating.IUpdate;
}): Promise<IShoppingMallProductRating> {
  // 1. Lookup the product rating
  const rating = await MyGlobal.prisma.shopping_mall_product_ratings.findFirst({
    where: {
      id: props.productRatingId,
      deleted_at: null,
    },
  });
  if (!rating)
    throw new HttpException("Product rating not found or deleted.", 404);

  // 2. Ownership check
  if (rating.shopping_mall_customer_id !== props.customer.id)
    throw new HttpException(
      "You do not have permission to update this rating.",
      403,
    );

  // 3. Edit window check (7 days after creation)
  const createdAt =
    rating.created_at instanceof Date
      ? rating.created_at.toISOString()
      : rating.created_at;
  const nowTime = toISOStringSafe(new Date());
  // Calculate 7 days in milliseconds (7*24*60*60*1000 = 604800000)
  const createdAtDate = new Date(createdAt);
  const expiredAtDate = new Date(createdAtDate.getTime() + 604800000);
  if (new Date(nowTime) > expiredAtDate) {
    throw new HttpException("Edit window for this rating has expired.", 403);
  }

  // 4. Ensure all referenced keys are valid (customer session, product, sku, order) and not soft-deleted
  // Fetch all foreign summary entities in parallel
  const [customer, session, product, productSku, order] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: {
        id: rating.shopping_mall_customer_id,
        is_email_verified: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: rating.shopping_mall_customer_session_id,
        shopping_mall_customer_id: rating.shopping_mall_customer_id,
        expired_at: null,
      },
    }),
    MyGlobal.prisma.shopping_mall_products.findFirst({
      where: {
        id: rating.shopping_mall_product_id,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_skus.findFirst({
      where: {
        id: rating.shopping_mall_product_sku_id,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.shopping_mall_orders.findFirst({
      where: {
        id: rating.shopping_mall_order_id,
        deleted_at: null,
      },
    }),
  ]);
  if (!customer || !session || !product || !productSku || !order) {
    throw new HttpException(
      "Invalid product rating: Missing or deleted references.",
      400,
    );
  }

  // 5. Update rating value and timestamp
  const updated = await MyGlobal.prisma.shopping_mall_product_ratings.update({
    where: { id: rating.id },
    data: {
      value: props.body.value,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 6. Return DTO with all summary fields and no native Date usage
  return {
    id: updated.id,
    customer: { id: customer.id, name: customer.name },
    session: {
      id: session.id,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : toISOStringSafe(session.created_at),
      last_active_at: toISOStringSafe(session.created_at), // Prisma schema does not have last_active_at field, so use created_at
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
      seller: { id: product.shopping_mall_seller_id, business_name: "" },
      categories: [],
      created_at: toISOStringSafe(product.created_at),
    },
    productSku: {
      id: productSku.id,
      code: productSku.sku_code,
      product_title: product.title,
      option_summary: "",
      in_stock: productSku.stock > 0,
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at
        ? toISOStringSafe(order.deleted_at)
        : undefined,
    },
    order_item_id: updated.shopping_mall_order_item_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      updated.shopping_mall_customer_session_id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_order_item_id: updated.shopping_mall_order_item_id,
    value: updated.value,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
