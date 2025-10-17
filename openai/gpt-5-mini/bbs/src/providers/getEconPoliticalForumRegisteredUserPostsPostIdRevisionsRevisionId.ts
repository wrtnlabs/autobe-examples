import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPostRevision";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getEconPoliticalForumRegisteredUserPostsPostIdRevisionsRevisionId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  revisionId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumPostRevision> {
  const { registeredUser, postId, revisionId } = props;

  // Verify the post exists and belongs to the caller
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: postId },
    select: { id: true, author_id: true },
  });

  if (!post) throw new HttpException("Not Found", 404);
  if (post.author_id !== registeredUser.id)
    throw new HttpException(
      "Unauthorized: You can only access your own post revisions",
      403,
    );

  // Fetch the revision and ensure it belongs to the post
  const revision =
    await MyGlobal.prisma.econ_political_forum_post_revisions.findFirst({
      where: { id: revisionId, post_id: postId },
      select: {
        id: true,
        post_id: true,
        editor_id: true,
        content: true,
        note: true,
        created_at: true,
      },
    });

  if (!revision) throw new HttpException("Not Found", 404);

  // Record access in audit logs
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: registeredUser.id,
      action_type: "read_revision",
      target_type: "post_revision",
      target_identifier: revisionId,
      created_at: now,
      created_by_system: false,
      details: null,
    },
  });

  return {
    id: revision.id as string & tags.Format<"uuid">,
    post_id: revision.post_id as string & tags.Format<"uuid">,
    editor_id: revision.editor_id ?? null,
    content: revision.content,
    note: revision.note ?? null,
    created_at: toISOStringSafe(revision.created_at),
  };
}
