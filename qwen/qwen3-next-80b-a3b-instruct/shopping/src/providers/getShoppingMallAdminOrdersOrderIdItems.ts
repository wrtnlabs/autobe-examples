import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallOrderItem> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query for order items with joins to product and seller information
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      order_id: props.orderId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      order_id: true,
      product_id: true,
      seller_id: true,
      quantity: true,
      price_at_time: true,
      status: true,
      created_at: true,
      updated_at: true,
      // Summarize the shopping_mall_products relations
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          category_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      // Summarize the shopping_mall_sellers relations
      seller: {
        select: {
          id: true,
          name: true, // Placeholder to be corrected
          description: true,
          logo_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      // Summarize the order_item_snapshots relations
      order_item_snapshots: {
        select: {
          id: true,
          product_id: true,
          seller_id: true,
          quantity: true,
          price_at_time: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 1,
      },
    },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      order_id: props.orderId,
      deleted_at: null,
    },
  });
  // Transform data to IShoppingMallOrderItem format
  const transformedData = data.map((item) => {
    // Get the most recent snapshot for this item
    const snapshot = item.order_item_snapshots?.[0];
    // Transform product information
    const product = item.product;
    // Transform seller information
    const seller = item.seller;
    return {
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      seller_id: item.seller_id,
      quantity: item.quantity,
      unit_price: Number(item.price_at_time),
      total_price: Number(item.price_at_time * item.quantity),
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        category_id: product.category_id,
        created_at: toISOStringSafe(product.created_at),
        updated_at: product.updated_at
          ? toISOStringSafe(product.updated_at)
          : null,
        deleted_at: product.deleted_at
          ? toISOStringSafe(product.deleted_at)
          : null,
      },
      seller: {
        id: seller.id,
        name: seller.name,
        description: seller.description,
        logo_url: seller.logo_url,
        created_at: toISOStringSafe(seller.created_at),
        updated_at: seller.updated_at
          ? toISOStringSafe(seller.updated_at)
          : null,
        deleted_at: seller.deleted_at
          ? toISOStringSafe(seller.deleted_at)
          : null,
      },
      snapshot: snapshot
        ? {
            id: snapshot.id,
            product_id: snapshot.product_id,
            seller_id: snapshot.seller_id,
            quantity: snapshot.quantity,
            unit_price: Number(snapshot.price_at_time),
            total_price: Number(snapshot.price_at_time * snapshot.quantity),
            status: snapshot.status,
            created_at: toISOStringSafe(snapshot.created_at),
            updated_at: snapshot.updated_at
              ? toISOStringSafe(snapshot.updated_at)
              : null,
          }
        : undefined,
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
