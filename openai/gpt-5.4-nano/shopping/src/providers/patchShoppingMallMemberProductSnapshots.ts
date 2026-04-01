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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberProductSnapshots(props: {
  member: MemberPayload;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  if (props.body.sourceType === undefined) {
    throw new HttpException("sourceType is required", 400);
  }
  const createdAtFrom = props.body.createdAtFrom ?? undefined;
  const createdAtTo = props.body.createdAtTo ?? undefined;
  const memberId = props.member.id;
  const visibleSnapshotIds =
    await MyGlobal.prisma.shopping_mall_snapshots.findMany({
      where: {
        deleted_at: null,
        source_type: props.body.sourceType,
        ...(props.body.productId !== undefined
          ? { source_entity_id: props.body.productId }
          : undefined),
        ...(props.body.sellerId !== undefined
          ? { source_seller_id: props.body.sellerId }
          : undefined),
        ...(createdAtFrom !== undefined || createdAtTo !== undefined
          ? {
              created_at: {
                ...(createdAtFrom !== undefined
                  ? { gte: createdAtFrom }
                  : undefined),
                ...(createdAtTo !== undefined
                  ? { lte: createdAtTo }
                  : undefined),
              },
            }
          : undefined),
        snapshotParties: {
          some: {
            can_view: true,
            deleted_at: null,
            party_id: memberId,
            party_type: {
              in: ["owner", "admin"],
            },
          },
        },
      } satisfies Prisma.shopping_mall_snapshotsWhereInput,
      select: {
        source_entity_id: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    });
  const allVisibleSnapshotIds =
    await MyGlobal.prisma.shopping_mall_snapshots.findMany({
      where: {
        deleted_at: null,
        source_type: props.body.sourceType,
        ...(props.body.productId !== undefined
          ? { source_entity_id: props.body.productId }
          : undefined),
        ...(props.body.sellerId !== undefined
          ? { source_seller_id: props.body.sellerId }
          : undefined),
        ...(createdAtFrom !== undefined || createdAtTo !== undefined
          ? {
              created_at: {
                ...(createdAtFrom !== undefined
                  ? { gte: createdAtFrom }
                  : undefined),
                ...(createdAtTo !== undefined
                  ? { lte: createdAtTo }
                  : undefined),
              },
            }
          : undefined),
        snapshotParties: {
          some: {
            can_view: true,
            deleted_at: null,
            party_id: memberId,
            party_type: {
              in: ["owner", "admin"],
            },
          },
        },
      } satisfies Prisma.shopping_mall_snapshotsWhereInput,
      select: {
        source_entity_id: true,
      },
    });
  const total = allVisibleSnapshotIds.length;
  const ids = visibleSnapshotIds.map((x) => x.source_entity_id);
  if (ids.length === 0) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: {
        id: { in: ids },
        ...(props.body.productId !== undefined
          ? { shopping_mall_product_id: props.body.productId }
          : undefined),
        ...(props.body.sellerId !== undefined
          ? { snapshot_seller_id: props.body.sellerId }
          : undefined),
      } satisfies Prisma.shopping_mall_product_snapshotsWhereInput,
      orderBy: {
        created_at: "desc",
      },
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
      } satisfies Prisma.shopping_mall_product_snapshotsSelect,
    });
  const indexById = new Map<string, number>();
  for (let i = 0; i < ids.length; i++) {
    indexById.set(ids[i], i);
  }
  snapshots.sort((a, b) => {
    const ia = indexById.get(a.id);
    const ib = indexById.get(b.id);
    return (ia ?? 0) - (ib ?? 0);
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: snapshots.map(
      (r) =>
        ({
          id: r.id,
          snapshot_code: r.snapshot_code,
          snapshot_name: r.snapshot_name,
          snapshot_description:
            r.snapshot_description === null ? null : r.snapshot_description,
          snapshot_category_id:
            r.snapshot_category_id === null ? null : r.snapshot_category_id,
          snapshot_seller_id: r.snapshot_seller_id,
          display_price: r.display_price === null ? null : r.display_price,
          is_listed: r.is_listed,
          created_at: toISOStringSafe(r.created_at),
          updated_at: toISOStringSafe(r.updated_at),
          deleted_at:
            r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
          shopping_mall_product_id: r.shopping_mall_product_id,
        }) satisfies IShoppingMallProductSnapshot.ISummary,
    ),
  };
}
