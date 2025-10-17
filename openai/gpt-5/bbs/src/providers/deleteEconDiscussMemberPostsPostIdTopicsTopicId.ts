import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberPostsPostIdTopicsTopicId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  topicId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, topicId } = props;

  // 1) Fetch target post and ensure it's active (not soft-deleted)
  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_user_id: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);

  // 2) Authorization: allow author, or active admin/moderator
  let authorized = post.econ_discuss_user_id === member.id;
  if (!authorized) {
    const admin = await MyGlobal.prisma.econ_discuss_admins.findFirst({
      where: {
        user_id: member.id,
        deleted_at: null,
        user: { is: { deleted_at: null } },
      },
      select: { id: true },
    });
    const moderator = admin
      ? null
      : await MyGlobal.prisma.econ_discuss_moderators.findFirst({
          where: {
            user_id: member.id,
            deleted_at: null,
            user: { is: { deleted_at: null } },
          },
          select: { id: true },
        });
    authorized = Boolean(admin || moderator);
  }
  if (!authorized) throw new HttpException("Forbidden", 403);

  // 3) Ensure topic exists and is active
  const topic = await MyGlobal.prisma.econ_discuss_topics.findFirst({
    where: { id: topicId, deleted_at: null },
    select: { id: true },
  });
  if (!topic) throw new HttpException("Topic not found", 404);

  // 4) Locate active association in junction table
  const association = await MyGlobal.prisma.econ_discuss_post_topics.findFirst({
    where: {
      econ_discuss_post_id: postId,
      econ_discuss_topic_id: topicId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!association) throw new HttpException("Association not found", 404);

  // 5) Soft delete the association by setting deleted_at (and update updated_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_post_topics.update({
    where: { id: association.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return;
}
