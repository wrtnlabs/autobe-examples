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

export async function patchShoppingMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  const searchFilter = props.body.search
    ? {
        OR: [
          {
            name: {
              contains: props.body.search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
          {
            description: {
              contains: props.body.search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
        ],
      }
    : undefined;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        ...searchFilter,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_product_id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_snapshots.count({
      where: {
        shopping_mall_product_id: props.productId,
        ...searchFilter,
      },
    }),
  ]);
  const data = records.map((r) => ({
    id: r.id,
    shoppingMallProductId: r.shopping_mall_product_id,
    name: r.name,
    description: r.description,
    categoryId: r.category_id,
    basePrice: r.base_price,
    deletedAt: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.seller.id,
      actor_type: "seller",
      event_type: "read_operation",
      description: "Seller read product snapshots.",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
