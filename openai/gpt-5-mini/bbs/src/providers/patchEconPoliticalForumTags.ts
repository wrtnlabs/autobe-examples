import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";
import { IPageIEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconPoliticalForumTags(props: {
  body: IEconPoliticalForumTag.IRequest;
}): Promise<IPageIEconPoliticalForumTag.ISummary> {
  const { body } = props;

  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;

  const page = Number(rawPage);
  const requestedLimit = Number(rawLimit);
  const MAX_LIMIT = 100;
  const limit = requestedLimit > 0 ? Math.min(requestedLimit, MAX_LIMIT) : 20;

  if (Number.isNaN(page) || page < 1) {
    throw new HttpException("Bad Request: page must be >= 1", 400);
  }
  if (Number.isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new HttpException(
      "Bad Request: limit must be between 1 and 100",
      400,
    );
  }

  if (body.includeDeleted === true) {
    throw new HttpException(
      "Forbidden: includeDeleted requires privileged access",
      403,
    );
  }

  const whereCondition = {
    deleted_at: null,
    ...(body.q !== undefined &&
      body.q !== null && {
        OR: [
          { name: { contains: body.q } },
          { description: { contains: body.q } },
        ],
      }),
  };

  // Ensure order is a literal 'asc' | 'desc' so it matches Prisma SortOrder
  const order: Prisma.SortOrder = body.order === "asc" ? "asc" : "desc";

  const orderBy =
    body.sort_by === "created_at" ? { created_at: order } : { name: order };

  try {
    if (body.cursor) {
      const results = await MyGlobal.prisma.econ_political_forum_tags.findMany({
        where: whereCondition,
        orderBy,
        cursor: { id: body.cursor },
        skip: 1,
        take: limit,
      });

      const total = await MyGlobal.prisma.econ_political_forum_tags.count({
        where: whereCondition,
      });

      return {
        pagination: {
          current: Number(page),
          limit: Number(limit),
          records: Number(total),
          pages: Math.ceil(Number(total) / Number(limit)) || 0,
        },
        data: results.map((r) => ({ id: r.id, name: r.name, slug: r.slug })),
      };
    }

    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_tags.findMany({
        where: whereCondition,
        orderBy,
        skip,
        take: limit,
      }),
      MyGlobal.prisma.econ_political_forum_tags.count({
        where: whereCondition,
      }),
    ]);

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: Number(total),
        pages: Math.ceil(Number(total) / Number(limit)) || 0,
      },
      data: results.map((r) => ({ id: r.id, name: r.name, slug: r.slug })),
    };
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
