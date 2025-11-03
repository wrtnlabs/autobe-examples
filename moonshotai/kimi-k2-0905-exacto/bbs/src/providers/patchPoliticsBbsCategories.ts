import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import { IPageIPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchPoliticsBbsCategories(props: {
  body: IPoliticsBbsCategory.IRequest;
}): Promise<IPageIPoliticsBbsCategory.ISummary> {
  const { body } = props;

  // Set defaults for pagination/sort parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const direction =
    body.direction ??
    (body.order_by === "created_at" ? ("desc" as const) : ("asc" as const));
  const orderBy = body.order_by ?? "sequence";
  const skip = Math.max(0, (page - 1) * limit);

  // Build where conditions
  const where: Record<string, unknown> = {};

  // Soft delete filter
  where.deleted_at = null;

  // Primary filter
  if (body.primary !== undefined && body.primary !== null) {
    where.primary = body.primary;
  }

  // Search filter (case-insensitive matching without mode for SQLite compatibility)
  if (body.search && body.search.trim()) {
    const searchTerm = body.search.toLowerCase().trim();
    where.OR = [
      { name: { contains: searchTerm } },
      { code: { contains: searchTerm } },
      { description: { contains: searchTerm } },
    ];
  }

  // Get total count
  const total = await MyGlobal.prisma.politics_bbs_categories.count({ where });

  // Get paginated results
  const models = await MyGlobal.prisma.politics_bbs_categories.findMany({
    where,
    orderBy: {
      [orderBy]: direction,
    },
    skip,
    take: limit,
  });

  // Convert models to summaries with proper date handling
  const data = models.map((model) => ({
    id: model.id as string & tags.Format<"uuid">,
    code: model.code,
    name: model.name,
    description: model.description,
    sequence: model.sequence as number & tags.Type<"int32"> & tags.Minimum<0>,
    primary: model.primary,
    required: model.required,
    multiplicative: model.multiplicative,
    color: model.color,
    icon: model.icon,
    created_at: toISOStringSafe(model.created_at),
    updated_at: model.updated_at ? toISOStringSafe(model.updated_at) : null,
    deleted_at: null, // Always null in results since we filter out deleted
  }));

  // Calculate total pages
  const pages = total > 0 ? Math.ceil(total / limit) : 1;

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: pages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
