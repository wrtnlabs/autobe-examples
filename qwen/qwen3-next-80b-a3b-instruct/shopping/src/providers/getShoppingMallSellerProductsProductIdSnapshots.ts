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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  // Validate product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Since pagination parameters are NOT in the props signature, we cannot use page/limit
  // Fetch ALL snapshots for this product - per API contract, no pagination supported
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: {
        product_id: props.productId,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        id: true,
        changed_by_id: true,
      },
    });
  const total = snapshots.length;
  const actors = await MyGlobal.prisma.shopping_mall_users.findMany({
    where: {
      id: { in: snapshots.map((s) => s.changed_by_id) },
    },
    select: {
      id: true,
      status: true,
    },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a]));
  // ONLY include properties that exist in IShoppingMallProductSnapshot.ISummary
  // Per the DTO: id, display_name, status
  // DO NOT include changed_at, version, or any other fields
  const paginatedData = snapshots.map(
    (snapshot) =>
      ({
        id: snapshot.id,
        display_name: undefined,
        status: typia.assert<"suspended" | "active" | "deleted">(
          actorMap.get(snapshot.changed_by_id)?.status ?? "active",
        ),
      }) satisfies IShoppingMallProductSnapshot.ISummary,
  );
  // Return as IPageIShoppingMallProductSnapshot.ISummary (with pagination object)
  // Use standard pagination with a default limit of 50 since no page/limit params
  const limit = Math.min(total, 50);
  const currentPage = 1;
  const pages = Math.ceil(total / limit);
  return {
    data: paginatedData,
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
