import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardTags(props: {
  body: IDiscussionBoardTag.IRequest;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 1);
  const rawLimit = Number(body.limit ?? 20);
  const limit = Math.min(Math.max(rawLimit, 1), 100);
  const skip = (page - 1) * limit;

  // Build where condition inline
  const where = {
    ...(body.includeArchived ? {} : { deleted_at: null }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && { is_active: body.is_active }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { name: { contains: body.search } },
          { slug: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
    ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          created_at: {
            ...(body.createdFrom !== undefined &&
              body.createdFrom !== null && {
                gte: toISOStringSafe(body.createdFrom),
              }),
            ...(body.createdTo !== undefined &&
              body.createdTo !== null && {
                lte: toISOStringSafe(body.createdTo),
              }),
          },
        }
      : {}),
  };

  // Inline orderBy for proper type inference - cast direction literals to Prisma.SortOrder
  const orderBy: Prisma.discussion_board_tagsOrderByWithRelationInput =
    body.sort === "name"
      ? { name: "asc" as Prisma.SortOrder }
      : body.sort === "-name"
        ? { name: "desc" as Prisma.SortOrder }
        : body.sort === "-createdAt"
          ? { created_at: "desc" as Prisma.SortOrder }
          : { created_at: "asc" as Prisma.SortOrder };

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_tags.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      MyGlobal.prisma.discussion_board_tags.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description ?? null,
      is_active: r.is_active,
      created_at: toISOStringSafe(r.created_at),
      updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : null,
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    }));

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: Number(total),
        pages: Number(Math.ceil(total / limit)),
      },
      data,
    };
  } catch (e) {
    throw new HttpException("Internal Server Error", 500);
  }
}
