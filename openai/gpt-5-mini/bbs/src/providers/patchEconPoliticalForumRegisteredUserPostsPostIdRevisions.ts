import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPostRevision";
import { IPageIEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumPostRevision";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function patchEconPoliticalForumRegisteredUserPostsPostIdRevisions(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumPostRevision.IRequest;
}): Promise<IPageIEconPoliticalForumPostRevision> {
  const { registeredUser, postId, body } = props;

  // Verify post existence and ownership
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: postId },
    select: { id: true, author_id: true },
  });

  if (!post) throw new HttpException("Not Found", 404);
  if (post.author_id !== registeredUser.id)
    throw new HttpException("Forbidden", 403);

  // Pagination defaults and limits
  const page = Number((body.page ?? 1) as number);
  const rawLimit = Number((body.limit ?? 20) as number);
  const limit = rawLimit > 200 ? 200 : rawLimit;
  if (page < 1 || limit < 1)
    throw new HttpException("Bad Request: invalid pagination", 400);
  const skip = (page - 1) * limit;

  // Sort
  const sort = body.sort ?? "created_at.desc";
  const order: Prisma.SortOrder = sort.endsWith(".asc") ? "asc" : "desc";

  // Build where condition
  const where: Record<string, unknown> = {
    post_id: postId,
  };

  if (body.editor_id !== undefined && body.editor_id !== null) {
    (where as Record<string, unknown>).editor_id = body.editor_id;
  }

  if (
    (body.from !== undefined && body.from !== null) ||
    (body.to !== undefined && body.to !== null)
  ) {
    (where as Record<string, unknown>).created_at = {
      ...(body.from !== undefined &&
        body.from !== null && { gte: toISOStringSafe(body.from) }),
      ...(body.to !== undefined &&
        body.to !== null && { lte: toISOStringSafe(body.to) }),
    };
  }

  // Count total matching records
  const total = await MyGlobal.prisma.econ_political_forum_post_revisions.count(
    { where: where as Prisma.econ_political_forum_post_revisionsWhereInput },
  );

  // Fetch revisions
  const rows =
    await MyGlobal.prisma.econ_political_forum_post_revisions.findMany({
      where: where as Prisma.econ_political_forum_post_revisionsWhereInput,
      orderBy: { created_at: order },
      skip,
      take: limit,
    });

  const includeFull = body.include_full === true;

  const data = rows.map((r) => ({
    id: r.id,
    post_id: r.post_id,
    editor_id: r.editor_id === null ? null : r.editor_id,
    content: includeFull
      ? r.content
      : r.content.length > 200
        ? r.content.slice(0, 200)
        : r.content,
    note: r.note === null ? null : r.note,
    created_at: toISOStringSafe(r.created_at),
  }));

  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Number(Math.ceil(total / limit)) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
