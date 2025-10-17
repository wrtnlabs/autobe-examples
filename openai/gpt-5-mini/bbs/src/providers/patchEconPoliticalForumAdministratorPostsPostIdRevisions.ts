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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchEconPoliticalForumAdministratorPostsPostIdRevisions(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumPostRevision.IRequest;
}): Promise<IPageIEconPoliticalForumPostRevision> {
  const { administrator, postId, body } = props;

  // Authorization: verify administrator enrollment and registered user state
  const admin =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
        registereduser: {
          deleted_at: null,
          is_banned: false,
        },
      },
    });

  if (admin === null) {
    throw new HttpException("Unauthorized: administrator not enrolled", 403);
  }

  // Verify the referenced post exists and is active
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Pagination defaults and limits
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 200);
  const skip = (page - 1) * limit;

  // Build where condition with careful null/undefined checks
  const whereCondition = {
    post_id: postId,
    deleted_at: null,
    ...(body.editor_id !== undefined &&
      body.editor_id !== null && { editor_id: body.editor_id }),
    ...(((body.from !== undefined && body.from !== null) ||
      (body.to !== undefined && body.to !== null)) && {
      created_at: {
        ...(body.from !== undefined &&
          body.from !== null && { gte: body.from }),
        ...(body.to !== undefined && body.to !== null && { lte: body.to }),
      },
    }),
  };

  // Inline orderBy for compatibility - ensure created_at is typed as Prisma.SortOrder
  const orderBy =
    body.sort === "created_at.asc"
      ? ({ created_at: "asc" } as { created_at: Prisma.SortOrder })
      : ({ created_at: "desc" } as { created_at: Prisma.SortOrder });

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_post_revisions.findMany({
        where: whereCondition,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          post_id: true,
          editor_id: true,
          content: true,
          note: true,
          created_at: true,
        },
      }),
      MyGlobal.prisma.econ_political_forum_post_revisions.count({
        where: whereCondition,
      }),
    ]);

    // Record audit log for this administrative access
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4(),
        registereduser_id: administrator.id,
        action_type: "view_revisions",
        target_type: "post",
        target_identifier: postId,
        details: JSON.stringify({ filters: body }),
        created_at: toISOStringSafe(new Date()),
        created_by_system: false,
      },
    });

    const data = rows.map((r) => ({
      id: r.id,
      post_id: r.post_id,
      // editor_id is optional+nullable in DTO - return null if DB null
      editor_id: r.editor_id ?? null,
      // Include full content only when explicitly requested
      content: body.include_full === true ? r.content : r.content.slice(0, 200),
      note: r.note ?? null,
      created_at: toISOStringSafe(r.created_at),
    }));

    const pagination = {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    };

    return { pagination, data };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
