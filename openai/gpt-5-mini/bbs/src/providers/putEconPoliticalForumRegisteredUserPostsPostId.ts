import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putEconPoliticalForumRegisteredUserPostsPostId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumPost.IUpdate;
}): Promise<IEconPoliticalForumPost> {
  const { registeredUser, postId, body } = props;

  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      thread_id: true,
      author_id: true,
      parent_id: true,
      content: true,
      is_edited: true,
      edited_at: true,
      is_hidden: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!post || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  if (post.author_id !== registeredUser.id) {
    throw new HttpException(
      "Unauthorized: Only the author can edit this post",
      403,
    );
  }

  const createdMs = new Date(post.created_at).getTime();
  const nowMs = Date.now();
  const editWindowMs = 24 * 60 * 60 * 1000;
  if (nowMs - createdMs > editWindowMs) {
    throw new HttpException("Forbidden: Edit window expired", 403);
  }

  const activeHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: { post_id: postId, is_active: true },
    });
  if (activeHold)
    throw new HttpException(
      "Locked: Legal hold prevents editing this post",
      423,
    );

  const activeReport =
    await MyGlobal.prisma.econ_political_forum_reports.findFirst({
      where: {
        reported_post_id: postId,
        status: { in: ["pending", "triaged", "escalated"] },
      },
    });
  if (activeReport)
    throw new HttpException("Locked: Post under active moderation", 423);

  await MyGlobal.prisma.econ_political_forum_post_revisions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: post.id,
      editor_id: registeredUser.id,
      content: post.content,
      note: null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  const updated = await MyGlobal.prisma.econ_political_forum_posts.update({
    where: { id: postId },
    data: {
      content: body.content ?? post.content,
      is_edited: true,
      edited_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: registeredUser.id,
      post_id: post.id,
      action_type: "edit",
      target_type: "post",
      target_identifier: post.id,
      details: `Post edited by registered user`,
      created_at: toISOStringSafe(new Date()),
      created_by_system: false,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    thread_id: updated.thread_id as string & tags.Format<"uuid">,
    author_id: updated.author_id as string & tags.Format<"uuid">,
    parent_id:
      updated.parent_id === null
        ? null
        : (updated.parent_id as string & tags.Format<"uuid">),
    content: updated.content,
    is_edited: updated.is_edited,
    edited_at: updated.edited_at ? toISOStringSafe(updated.edited_at) : null,
    is_hidden: updated.is_hidden,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
