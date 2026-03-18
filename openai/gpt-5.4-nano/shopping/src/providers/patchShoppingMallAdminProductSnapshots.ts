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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminProductSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const current = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort;
  const orderBy =
    sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  const createdAtFilter: Prisma.shopping_mall_snapshotsWhereInput["created_at"] =
    {
      ...(props.body.createdAtFrom !== undefined
        ? { gte: props.body.createdAtFrom }
        : {}),
      ...(props.body.createdAtTo !== undefined
        ? { lte: props.body.createdAtTo }
        : {}),
    };
  const visibleSnapshotIds =
    await MyGlobal.prisma.shopping_mall_snapshots.findMany({
      where: {
        ...(props.body.sourceType !== undefined
          ? { source_type: props.body.sourceType }
          : {}),
        created_at: {
          ...(props.body.createdAtFrom !== undefined
            ? { gte: props.body.createdAtFrom }
            : {}),
          ...(props.body.createdAtTo !== undefined
            ? { lte: props.body.createdAtTo }
            : {}),
        },
        ...(props.body.productId !== undefined
          ? {
              source_entity_id: props.body.productId,
            }
          : {}),
        ...(props.body.sellerId !== undefined
          ? {
              source_seller_id: props.body.sellerId,
            }
          : {}),
        deleted_at: null,
        snapshotParties: {
          some: {
            party_type: "admin",
            party_id: props.admin.id,
            can_view: true,
            deleted_at: null,
          },
        },
      },
      select: { source_entity_id: true },
      orderBy: { created_at: orderBy.created_at },
      skip: (current - 1) * limit,
      take: limit,
    });
  const ids = visibleSnapshotIds.map((x) => x.source_entity_id) satisfies Array<
    string & tags.Format<"uuid">
  >;
  const [rows, total] = await (async () => {
    const [data, count] = await Promise.all([
      MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
        where: {
          deleted_at: null,
          ...(ids.length > 0 ? { id: { in: ids } } : { id: { in: [] } }),
          ...(props.body.productId !== undefined
            ? { shopping_mall_product_id: props.body.productId }
            : {}),
          ...(props.body.sellerId !== undefined
            ? { snapshot_seller_id: props.body.sellerId }
            : {}),
          ...(props.body.createdAtFrom !== undefined ||
          props.body.createdAtTo !== undefined
            ? {
                created_at: {
                  ...(props.body.createdAtFrom !== undefined
                    ? { gte: props.body.createdAtFrom }
                    : {}),
                  ...(props.body.createdAtTo !== undefined
                    ? { lte: props.body.createdAtTo }
                    : {}),
                },
              }
            : {}),
        },
        orderBy,
        select: {
          id: true,
          snapshot_code: true,
          snapshot_name: true,
          snapshot_description: true,
          snapshot_category_id: true,
          snapshot_seller_id: true,
          display_price: true,
          is_listed: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          shopping_mall_product_id: true,
        },
      }),
      MyGlobal.prisma.shopping_mall_snapshots.count({
        where: {
          ...(props.body.sourceType !== undefined
            ? { source_type: props.body.sourceType }
            : {}),
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: props.body.createdAtTo }
              : {}),
          },
          ...(props.body.productId !== undefined
            ? { source_entity_id: props.body.productId }
            : {}),
          ...(props.body.sellerId !== undefined
            ? { source_seller_id: props.body.sellerId }
            : {}),
          deleted_at: null,
          snapshotParties: {
            some: {
              party_type: "admin",
              party_id: props.admin.id,
              can_view: true,
              deleted_at: null,
            },
          },
        },
      }),
    ]);
    return [data, count] as const;
  })();
  return {
    pagination: {
      current,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: rows.map((r) => ({
      id: r.id,
      snapshot_code: r.snapshot_code,
      snapshot_name: r.snapshot_name,
      snapshot_description: r.snapshot_description,
      snapshot_category_id: r.snapshot_category_id,
      snapshot_seller_id: r.snapshot_seller_id,
      display_price: r.display_price,
      is_listed: r.is_listed,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
      shopping_mall_product_id: r.shopping_mall_product_id,
    })),
  } satisfies IPageIShoppingMallProductSnapshot.ISummary;
}
