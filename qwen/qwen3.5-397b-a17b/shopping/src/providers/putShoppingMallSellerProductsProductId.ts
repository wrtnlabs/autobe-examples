import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        deleted_at: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
    });
  if (pendingOrderItems) {
    throw new HttpException("Cannot update product with pending orders", 400);
  }
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const orderItemIds = orderItems.map((oi) => oi.id);
  if (orderItemIds.length > 0) {
    const pendingCancellation =
      await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
        where: {
          shopping_mall_order_item_id: { in: orderItemIds },
          status: "pending",
          deleted_at: null,
        },
      });
    if (pendingCancellation) {
      throw new HttpException(
        "Cannot update product with pending cancellation requests",
        400,
      );
    }
    const pendingRefund =
      await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
        where: {
          order_item_id: { in: orderItemIds },
          status: "pending",
          deleted_at: null,
        },
      });
    if (pendingRefund) {
      throw new HttpException(
        "Cannot update product with pending refund requests",
        400,
      );
    }
  }
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      shopping_mall_category_id: product.category_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      created_at: new Date(),
    },
  });
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.category_id !== undefined && {
        category_id: props.body.category_id,
      }),
      ...(props.body.base_price !== undefined && {
        base_price: props.body.base_price,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
  return await ShoppingMallProductTransformer.transform(updated);
}
