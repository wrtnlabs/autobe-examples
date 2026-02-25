import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getShoppingMallCustomerProductsProductIdSnapshots(props: {
  customer: CustomerPayload;
  productId: string;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Verify product exists and belongs to customer through direct relationship
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.customer.id,
    },
  });
  if (!product) {
    throw new HttpException("Forbidden", 403);
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: {
        product_id: props.productId,
      },
      orderBy: {
        version: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        product_id: true,
        category_id: true,
        changed_by_id: true,
        version: true,
        changed_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_snapshots.count({
      where: {
        product_id: props.productId,
      },
    }),
  ]);
  // Extract unique changed_by_id values
  const changedByIds = [...new Set(data.map((s) => s.changed_by_id))];
  // Query all changed_by users in single batch
  const changedByUsers = await MyGlobal.prisma.shopping_mall_users.findMany({
    where: { id: { in: changedByIds } },
    ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
  });
  // Create mapping from id to transformed user
  const changedByMap = new Map<string, IShoppingMallProductSnapshot.ISummary>();
  for (const user of changedByUsers) {
    changedByMap.set(
      user.id,
      await ShoppingMallProductSnapshotAtSummaryTransformer.transform(user),
    );
  }
  // Map snapshot to response with transformed user data
  const mappedData = data.map((snapshot) => {
    const changedBy = changedByMap.get(snapshot.changed_by_id);
    if (!changedBy) {
      throw new HttpException("User not found", 404);
    }
    return {
      ...changedBy,
      version: snapshot.version,
      changed_at: snapshot.changed_at.toISOString(),
      product_id: snapshot.product_id,
      category_id: snapshot.category_id,
      id: snapshot.id,
    };
  });
  return {
    data: mappedData satisfies IPageIShoppingMallProductSnapshot.ISummary["data"],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProductSnapshot.ISummary;
}
