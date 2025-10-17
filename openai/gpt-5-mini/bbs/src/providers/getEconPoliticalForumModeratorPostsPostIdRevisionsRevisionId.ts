import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPostRevision";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconPoliticalForumModeratorPostsPostIdRevisionsRevisionId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  revisionId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumPostRevision> {
  const { moderator, postId, revisionId } = props;

  // Authorization: ensure the caller is an active moderator
  const moderatorRecord =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: moderator.id,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    });

  if (moderatorRecord === null) {
    throw new HttpException(
      "Unauthorized: You must be an active moderator",
      403,
    );
  }

  // Retrieve the revision and ensure it belongs to the requested post
  const revision =
    await MyGlobal.prisma.econ_political_forum_post_revisions.findFirst({
      where: {
        id: revisionId,
        post_id: postId,
      },
    });

  if (revision === null) {
    throw new HttpException("Not Found", 404);
  }

  // Log the moderator access for audit purposes
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: moderator.id,
      moderator_id: moderatorRecord.id,
      post_id: postId,
      action_type: "view",
      target_type: "post_revision",
      target_identifier: revisionId,
      details: `Moderator ${moderator.id} viewed post revision ${revisionId}`,
      created_at: toISOStringSafe(new Date()),
      created_by_system: false,
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
