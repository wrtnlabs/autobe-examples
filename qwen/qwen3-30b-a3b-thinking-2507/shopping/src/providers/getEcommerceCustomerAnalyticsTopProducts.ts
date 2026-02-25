import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerAnalyticsTopProducts(props: {
  customer: CustomerPayload;
}): Promise<IPageIEcommerceProduct.ISummary> {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: {
      created_at: { gte: cutoffDate },
      status: { in: ["paid", "shipped", "delivered"] },
    },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              base_price: true,
              category_id: true,
              created_at: true,
              category: true,
            },
          },
        },
      },
    },
  });
  const productSums: {
    [key: string]: number;
  } = {};
  for (const item of orderItems) {
    if (item.variant?.product) {
      productSums[item.variant.product.id] =
        (productSums[item.variant.product.id] || 0) + item.quantity;
    }
  }
  const topProductIds = Object.keys(productSums)
    .sort((a, b) => productSums[b] - productSums[a])
    .slice(0, 10);
  const products = await MyGlobal.prisma.ecommerce_products.findMany({
    where: {
      id: { in: topProductIds },
      deleted_at: null,
    },
    include: {
      category: true,
    },
  });
  const data = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description ?? null,
    base_price: product.base_price,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          description: product.category.description,
          created_at: toISOStringSafe(product.category.created_at),
          updated_at: toISOStringSafe(product.category.updated_at),
        }
      : {
          id: "uncategorized",
          name: "Uncategorized",
          description: null,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
    created_at: toISOStringSafe(product.created_at),
  }));
  const totalRecords = Object.keys(productSums).length;
  const pages = Math.ceil(totalRecords / 10);
  const current = 1;
  return {
    data,
    pagination: {
      current,
      limit: 10,
      records: totalRecords,
      pages,
    } as IPage.IPagination,
  };
}
