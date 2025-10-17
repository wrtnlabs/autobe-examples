import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";

export async function getEconPoliticalForumThreadsThreadIdTags(props: {
  threadId: string & tags.Format<"uuid">;
  page: number & tags.Type<"int32">;
  pageSize: number & tags.Type<"int32">;
}): Promise<IPageIEconPoliticalForumTag.ISummary> {
  const { threadId } = props;

  // Ensure the thread exists and is not soft-deleted
  const thread = await MyGlobal.prisma.econ_political_forum_threads.findUnique({
    where: { id: threadId },
    select: { id: true, deleted_at: true },
  });

  if (!thread || thread.deleted_at != null) {
    throw new HttpException("Not Found", 404);
  }

  // Pagination normalization
  const pageNumber = Number(props.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  let limit = Number(props.pageSize ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  if (!Number.isFinite(limit) || limit < 1)
    limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  if (limit > 100)
    limit = 100 as number & tags.Type<"int32"> & tags.Maximum<100> as number;
  const skip = (pageNumber - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_thread_tags.findMany({
      where: {
        thread_id: threadId,
        deleted_at: null,
        tag: { deleted_at: null },
      },
      include: { tag: true },
      orderBy: { created_at: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_political_forum_thread_tags.count({
      where: {
        thread_id: threadId,
        deleted_at: null,
        tag: { deleted_at: null },
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.tag.id,
    name: r.tag.name,
    slug: r.tag.slug,
  }));

  const pages = Math.ceil(total / limit) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  return {
    pagination: {
      current: pageNumber,
      limit,
      records: total,
      pages,
    },
    data,
  };
}
