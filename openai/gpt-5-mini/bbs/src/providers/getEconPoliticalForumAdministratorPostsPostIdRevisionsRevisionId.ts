import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPostRevision";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getEconPoliticalForumAdministratorPostsPostIdRevisionsRevisionId(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  revisionId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumPostRevision> {
  const { administrator, postId, revisionId } = props;

  // Authorization: ensure administrator enrollment exists
  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
    });
  if (!adminRecord) {
    throw new HttpException("Unauthorized: administrator not enrolled", 403);
  }

  // Fetch the revision ensuring it belongs to the specified post
  let revision;
  try {
    revision =
      await MyGlobal.prisma.econ_political_forum_post_revisions.findFirstOrThrow(
        {
          where: {
            id: revisionId,
            post_id: postId,
          },
        },
      );
  } catch (err) {
    throw new HttpException("Not Found", 404);
  }

  // Record audit log for administrative access
  const auditId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: auditId,
      registereduser_id: administrator.id,
      action_type: "view_revision",
      target_type: "post_revision",
      target_identifier: revision.id,
      details: JSON.stringify({ post_id: revision.post_id }),
      created_at: toISOStringSafe(new Date()),
      created_by_system: false,
    },
  });

  // Map database result to DTO, handling nullable fields correctly
  return {
    id: revision.id as string & tags.Format<"uuid">,
    post_id: revision.post_id as string & tags.Format<"uuid">,
    editor_id:
      revision.editor_id === null
        ? null
        : (revision.editor_id as string & tags.Format<"uuid">),
    content: revision.content,
    note: revision.note === null ? null : revision.note,
    created_at: toISOStringSafe(revision.created_at),
  };
}
