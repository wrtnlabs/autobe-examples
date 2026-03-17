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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCategoriesCategoryIdSnapshots(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategorySnapshot.IRequest;
}): Promise<IPageIEcommerceMallCategorySnapshot.ISummary> {
  // Build WHERE clause - filter by categoryId
  const where: Prisma.ecommerce_mall_category_snapshotsWhereInput = {
    snapshot_id: props.categoryId,
  };
  // Apply optional date range filters
  if (props.body.from_date !== undefined) {
    where.created_at = {
      gte: new Date(props.body.from_date),
    };
  }
  if (props.body.to_date !== undefined) {
    where.created_at = {
      lte: new Date(props.body.to_date),
    };
  }
  // Apply text search on name, slug, description fields
  if (props.body.search !== undefined && props.body.search.trim().length > 0) {
    const searchCondition = props.body.search;
    where.OR = [
      { name: { contains: searchCondition, mode: "insensitive" } },
      { slug: { contains: searchCondition, mode: "insensitive" } },
      { description: { contains: searchCondition, mode: "insensitive" } },
    ];
  }
  // Determine ORDER BY clause
  const orderBy: Prisma.ecommerce_mall_category_snapshotsOrderByWithRelationInput =
    props.body.sort === "name"
      ? { name: "asc" }
      : props.body.sort === "category"
        ? { snapshot_id: "asc" }
        : props.body.sort === "slug"
          ? { slug: "asc" }
          : { created_at: "desc" };
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots with required fields
  const data = await MyGlobal.prisma.ecommerce_mall_category_snapshots.findMany(
    {
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        snapshot_id: true,
        code: true,
        name: true,
        description: true,
        slug: true,
        parent_id: true,
        level: true,
        sort_order: true,
        is_active: true,
        created_at: true,
      },
    },
  );
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_category_snapshots.count({
    where,
  });
  // Transform database records to DTO format
  const transformedData = data.map((snapshot) => ({
    id: snapshot.id,
    snapshotId: snapshot.snapshot_id,
    code: snapshot.code,
    name: snapshot.name,
    description: snapshot.description,
    slug: snapshot.slug,
    parentId: snapshot.parent_id,
    level: snapshot.level,
    sortOrder: snapshot.sort_order,
    isActive: snapshot.is_active,
    createdAt: toISOStringSafe(snapshot.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallCategorySnapshot.ISummary;
}
