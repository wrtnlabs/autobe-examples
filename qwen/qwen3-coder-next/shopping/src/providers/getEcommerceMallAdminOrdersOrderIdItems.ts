import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: { order_id: props.orderId },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      quantity: true,
      product_name: true,
      variant_options: true,
      product_price: true,
      item_status: true,
      created_at: true,
      product_id: true,
      variant_id: true,
      seller_id: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: { order_id: props.orderId },
  });
  const items = await Promise.all(
    data.map(async (item) => {
      const product =
        await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
          where: { id: item.product_id },
          select: {
            id: true,
            name: true,
            base_price: true,
            is_available: true,
            created_at: true,
            seller_id: true,
          },
        });
      const productImage =
        await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
          where: { product_id: item.product_id, is_main: true },
          select: {
            id: true,
            image_url: true,
            sort_order: true,
            is_main: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        });
      const variant =
        await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow(
          {
            where: { id: item.variant_id },
            select: {
              id: true,
              sku_code: true,
              price_override: true,
              stock_quantity: true,
            },
          },
        );
      const seller =
        await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
          where: { id: item.seller_id },
          select: {
            id: true,
            shop_name: true,
            approval_status: true,
            is_suspended: true,
            created_at: true,
          },
        });
      return {
        id: item.id as string & tags.Format<"uuid">,
        quantity: item.quantity as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        product_name: item.product_name,
        variant_options: item.variant_options,
        product_price: item.product_price,
        item_status: item.item_status as
          | "paid"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
        product: {
          id: product.id as string & tags.Format<"uuid">,
          name: product.name,
          base_price: product.base_price,
          is_available: product.is_available,
          created_at: toISOStringSafe(product.created_at) as string &
            tags.Format<"date-time">,
          seller: {
            id: product.seller_id as string & tags.Format<"uuid">,
            shop_name: seller.shop_name,
            approval_status: seller.approval_status,
            is_suspended: seller.is_suspended,
            created_at: toISOStringSafe(seller.created_at) as string &
              tags.Format<"date-time">,
          },
          main_image: {
            id: productImage.id,
            image_url: productImage.image_url,
            sort_order: productImage.sort_order,
            is_main: productImage.is_main,
            created_at: toISOStringSafe(productImage.created_at) as string &
              tags.Format<"date-time">,
            updated_at: toISOStringSafe(productImage.updated_at) as string &
              tags.Format<"date-time">,
            deleted_at: productImage.deleted_at
              ? (toISOStringSafe(productImage.deleted_at) as string &
                  tags.Format<"date-time">)
              : null,
          },
        } satisfies IEcommerceMallProduct.ISummary,
        variant: {
          id: variant.id as string & tags.Format<"uuid">,
          sku_code: variant.sku_code,
          price_override: variant.price_override ?? null,
          stock_quantity: variant.stock_quantity as number & tags.Type<"int32">,
        } satisfies IEcommerceMallProductVariant.ISummary,
        seller: {
          id: seller.id as string & tags.Format<"uuid">,
          shop_name: seller.shop_name,
          approval_status: seller.approval_status,
          is_suspended: seller.is_suspended,
          created_at: toISOStringSafe(seller.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceMallSeller.ISummary,
      } satisfies IEcommerceMallOrderItem.ISummary;
    }),
  );
  return {
    data: items,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  } satisfies IPageIEcommerceMallOrderItem.ISummary;
}
