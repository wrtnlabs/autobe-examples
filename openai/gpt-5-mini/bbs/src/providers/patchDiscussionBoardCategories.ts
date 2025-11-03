import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardCategories(props: {
  body: IDiscussionBoardCategory.IRequest;
}): Promise<IPageIDiscussionBoardCategory.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);

  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException(
      "Bad Request: limit must be between 1 and 100",
      400,
    );

  const isActive = body.isActive !== undefined ? body.isActive : body.is_active;
  const includeArchived = body.includeArchived === true;

  // Build where condition safely with conditional spreads
  const whereCondition: Record<string, unknown> = {
    ...(includeArchived ? {} : { deleted_at: null }),
    ...(isActive !== undefined && { is_active: isActive }),
    ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          created_at: {
            ...(body.createdFrom !== undefined &&
              body.createdFrom !== null && { gte: body.createdFrom }),
            ...(body.createdTo !== undefined &&
              body.createdTo !== null && { lte: body.createdTo }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        OR: [
          { name: { contains: body.search } },
          { slug: { contains: body.search } },
        ],
      }),
  };

  const skip = (page - 1) * limit;

  const orderBy = body.sort
    ? body.sort === "createdAt"
      ? { created_at: "asc" as Prisma.SortOrder }
      : body.sort === "-createdAt"
        ? { created_at: "desc" as Prisma.SortOrder }
        : body.sort === "sortOrder"
          ? { sort_order: "asc" as Prisma.SortOrder }
          : body.sort === "-sortOrder"
            ? { sort_order: "desc" as Prisma.SortOrder }
            : { sort_order: "asc" as Prisma.SortOrder }
    : { sort_order: "asc" as Prisma.SortOrder };

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_categories.findMany({
        where: whereCondition,
        orderBy,
        skip,
        take: limit,
      }),
      MyGlobal.prisma.discussion_board_categories.count({
        where: whereCondition,
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description ?? null,
      is_active: r.is_active,
      sort_order: r.sort_order ?? null,
      created_at: toISOStringSafe(r.created_at),
      updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : null,
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    }));

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / Number(limit)),
      },
      data,
    };
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
