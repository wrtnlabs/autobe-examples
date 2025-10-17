import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

export async function getEconDiscussPosts(): Promise<IPageIEconDiscussPost.ISummary> {
  const current = 0;
  const limit = 20;
  const now = toISOStringSafe(new Date());

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_posts.findMany({
      where: {
        deleted_at: null,
        published_at: {
          not: null,
          lte: now,
        },
      },
      orderBy: { published_at: "desc" },
      skip: current * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        summary: true,
        econ_discuss_user_id: true,
        published_at: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.econ_discuss_posts.count({
      where: {
        deleted_at: null,
        published_at: {
          not: null,
          lte: now,
        },
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(current),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data: rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      title: r.title,
      summary: r.summary ?? null,
      author_user_id: r.econ_discuss_user_id as string & tags.Format<"uuid">,
      published_at: r.published_at
        ? toISOStringSafe(r.published_at)
        : undefined,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
