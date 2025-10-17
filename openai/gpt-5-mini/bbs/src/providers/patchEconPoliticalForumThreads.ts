import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import { IPageIEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumThread";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconPoliticalForumThreads(props: {
  body: IEconPoliticalForumThread.IRequest;
}): Promise<IPageIEconPoliticalForumThread.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  if (body.includeDeleted === true) {
    throw new HttpException("Unauthorized: includeDeleted is restricted", 401);
  }

  const buildWhereCondition = () => {
    const base: Record<string, unknown> = {
      deleted_at: null,
      ...(body.category_id !== undefined &&
        body.category_id !== null && { category_id: body.category_id }),
      ...(body.author_id !== undefined &&
        body.author_id !== null && { author_id: body.author_id }),
      ...(body.status !== undefined &&
        body.status !== null && { status: body.status }),
      ...(body.pinned !== undefined &&
        body.pinned !== null && { pinned: body.pinned }),
      ...(body.q !== undefined &&
        body.q !== null && { title: { contains: body.q } }),
      ...(body.created_from !== undefined &&
        body.created_from !== null && {
          created_at: { gte: toISOStringSafe(body.created_from) },
        }),
      ...(body.created_to !== undefined &&
        body.created_to !== null && {
          created_at: { lte: toISOStringSafe(body.created_to) },
        }),
    };

    if (body.tag_id !== undefined && body.tag_id !== null) {
      (base as any).econ_political_forum_thread_tags = {
        some: {
          tag_id: body.tag_id,
          deleted_at: null,
        },
      };
    }

    const gating = {
      AND: [
        { category: { requires_verification: false } },
        {
          OR: [
            { category: { is_moderated: false } },
            { status: { not: "pending" } },
          ],
        },
      ],
    };

    return { ...base, ...gating };
  };

  try {
    const whereCondition = buildWhereCondition();

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_threads.findMany({
        where: whereCondition,
        select: {
          id: true,
          category_id: true,
          author_id: true,
          title: true,
          slug: true,
          status: true,
          pinned: true,
          created_at: true,
          updated_at: true,
        },
        orderBy:
          body.sort_by === "oldest"
            ? { created_at: "asc" }
            : body.sort_by === "pinned"
              ? [{ pinned: "desc" }, { created_at: "desc" }]
              : { created_at: body.order === "asc" ? "asc" : "desc" },
        skip,
        take: limit,
      }),
      MyGlobal.prisma.econ_political_forum_threads.count({
        where: whereCondition,
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      category_id: r.category_id,
      author_id: r.author_id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      pinned: r.pinned,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    }));

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
