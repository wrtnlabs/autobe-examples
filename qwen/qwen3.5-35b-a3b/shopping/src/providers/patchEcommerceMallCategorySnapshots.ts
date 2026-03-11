import { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCategorySnapshots(props: {
  body: IEcommerceMallCategorySnapshot.IRequest;
}): Promise<IPageIEcommerceMallCategorySnapshot.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort;
  const sortOrder = props.body.order ?? "desc";
  const whereInput: Prisma.ecommerce_mall_category_snapshotsWhereInput = {
    ...(props.body.ecommerce_mall_category_id !== undefined && {
      ecommerce_mall_category_id: props.body.ecommerce_mall_category_id,
    }),
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.snapshot_created_at_from !== undefined && {
      snapshot_created_at: { gte: props.body.snapshot_created_at_from },
    }),
    ...(props.body.snapshot_created_at_to !== undefined && {
      snapshot_created_at: { lte: props.body.snapshot_created_at_to },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: props.body.created_at_to },
    }),
    ...(props.body.updated_at_from !== undefined && {
      updated_at: { gte: props.body.updated_at_from },
    }),
    ...(props.body.updated_at_to !== undefined && {
      updated_at: { lte: props.body.updated_at_to },
    }),
    ...(props.body.is_leaf !== undefined && {
      is_leaf: props.body.is_leaf,
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_category_snapshotsOrderByWithRelationInput[] =
    [
      sortField === "name"
        ? { name: sortOrder }
        : sortField === "created_at"
          ? { created_at: sortOrder }
          : sortField === "updated_at"
            ? { updated_at: sortOrder }
            : sortField === "is_leaf"
              ? { is_leaf: sortOrder }
              : sortField === "id"
                ? { id: sortOrder }
                : { snapshot_created_at: sortOrder },
    ];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_category_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ecommerce_mall_category_snapshots.count({
      where: whereInput,
    }),
  ]);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      snapshot_created_at: toISOStringSafe(record.snapshot_created_at),
      name: record.name,
      description: record.description,
      is_leaf: record.is_leaf,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      parent_category_id: record.parent_category_id as
        | (string & tags.Format<"uuid">)
        | null,
    })),
  } satisfies IPageIEcommerceMallCategorySnapshot.ISummary;
}
