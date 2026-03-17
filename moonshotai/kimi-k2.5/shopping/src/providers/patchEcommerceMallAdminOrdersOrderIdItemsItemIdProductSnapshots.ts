import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemProductSnapshot";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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

export async function patchEcommerceMallAdminOrdersOrderIdItemsItemIdProductSnapshots(props: {
  admin: AdminPayload;
  orderId: string;
  itemId: string;
  body: IEcommerceMallOrderItemProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemProductSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    order_item_id: props.itemId,
    ...(props.body.search !== null && {
      productSnapshot: {
        name: { contains: props.body.search, mode: "insensitive" as const },
      },
    }),
    ...(props.body.createdAtFrom !== null && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== null && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
  } satisfies Prisma.ecommerce_mall_order_item_snapshotsWhereInput;
  const rows =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        product_snapshot_id: true,
        variant_snapshot_id: true,
        seller_snapshot_id: true,
        created_at: true,
        productSnapshot: {
          select: {
            id: true,
            name: true,
            category_name: true,
            base_price: true,
            created_at: true,
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                  },
                } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
              },
            } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_order_item_product_snapshotsFindManyArgs,
      },
    });
  const total = await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.count(
    {
      where: whereInput,
    },
  );
  const data = await ArrayUtil.asyncMap(
    rows,
    async (row) =>
      ({
        id: row.productSnapshot.id,
        name: row.productSnapshot.name,
        categoryName: row.productSnapshot.category_name ?? null,
        basePrice: row.productSnapshot.base_price,
        createdAt: row.productSnapshot.created_at.toISOString(),
        category: row.productSnapshot.category
          ? {
              id: row.productSnapshot.category.id,
              name: row.productSnapshot.category.name,
              description: row.productSnapshot.category.description,
              createdAt: row.productSnapshot.category.created_at.toISOString(),
              parent: row.productSnapshot.category.parent
                ? {
                    id: row.productSnapshot.category.parent.id,
                    name: row.productSnapshot.category.parent.name,
                  }
                : null,
            }
          : null,
      }) satisfies IEcommerceMallOrderItemProductSnapshot.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
