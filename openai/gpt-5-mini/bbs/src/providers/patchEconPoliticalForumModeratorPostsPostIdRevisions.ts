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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconPoliticalForumModeratorPostsPostIdRevisions(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumPostRevision.IRequest;
}): Promise<IPageIEconPoliticalForumPostRevision> {
  const { moderator, postId, body } = props;

  // Authorization: ensure moderator still active in DB
  const moderatorRecord =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });

  if (moderatorRecord === null) {
    throw new HttpException(
      "Unauthorized: You must be an active moderator",
      403,
    );
  }

  // Ensure the post exists and is not soft-deleted
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Pagination defaults and validation
  const page = Number(body.page ?? 1);
  const limitRaw = Number(body.limit ?? 20);
  if (page < 1 || limitRaw < 1) {
    throw new HttpException("Bad Request: invalid pagination", 400);
  }
  const limit = Math.min(limitRaw, 200);
  const take = limit;
  const skip = (page - 1) * take;

  // Sort parsing
  const orderBy =
    body.sort === "created_at.asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };

  // Execute queries in parallel. Build where clause inline to comply with rules.
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_post_revisions.findMany({
      where: {
        post_id: postId,
        ...(body.editor_id !== undefined &&
          body.editor_id !== null && { editor_id: body.editor_id }),
        ...((body.from !== undefined && body.from !== null) ||
        (body.to !== undefined && body.to !== null)
          ? {
              created_at: {
                ...(body.from !== undefined &&
                  body.from !== null && { gte: body.from }),
                ...(body.to !== undefined &&
                  body.to !== null && { lte: body.to }),
              },
            }
          : {}),
      },
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.econ_political_forum_post_revisions.count({
      where: {
        post_id: postId,
        ...(body.editor_id !== undefined &&
          body.editor_id !== null && { editor_id: body.editor_id }),
        ...((body.from !== undefined && body.from !== null) ||
        (body.to !== undefined && body.to !== null)
          ? {
              created_at: {
                ...(body.from !== undefined &&
                  body.from !== null && { gte: body.from }),
                ...(body.to !== undefined &&
                  body.to !== null && { lte: body.to }),
              },
            }
          : {}),
      },
    }),
  ]);

  // Record audit log for moderator access
  const auditCreatedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: moderatorRecord.id,
      post_id: postId,
      action_type: "view_revisions",
      target_type: "post",
      target_identifier: postId,
      created_at: auditCreatedAt,
      created_by_system: false,
    },
  });

  // Map DB rows to DTO, converting Date -> ISO strings and handling nulls
  const data = rows.map((r) => {
    return {
      id: r.id as string & tags.Format<"uuid">,
      post_id: r.post_id as string & tags.Format<"uuid">,
      editor_id:
        r.editor_id === null
          ? null
          : (r.editor_id as string & tags.Format<"uuid">),
      content: r.content,
      note: r.note ?? null,
      created_at: toISOStringSafe(r.created_at),
    } satisfies IEconPoliticalForumPostRevision;
  });

  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  } satisfies IPageIEconPoliticalForumPostRevision;
}
