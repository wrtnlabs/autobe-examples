import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberPostsPostIdPoll(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId } = props;

  // 1) Ensure post exists and is active
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
  if (!post) throw new HttpException("Not Found", 404);

  // 2) Authorization: post author or active admin/moderator
  if (post.econ_discuss_user_id !== member.id) {
    const [adminRole, moderatorRole] = await Promise.all([
      MyGlobal.prisma.econ_discuss_admins.findFirst({
        where: {
          user_id: member.id,
          deleted_at: null,
          user: { is: { deleted_at: null } },
        },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_moderators.findFirst({
        where: {
          user_id: member.id,
          deleted_at: null,
          user: { is: { deleted_at: null } },
        },
        select: { id: true },
      }),
    ]);

    if (!adminRole && !moderatorRole) {
      throw new HttpException("Forbidden", 403);
    }
  }

  // 3) Locate poll by unique post linkage
  const poll = await MyGlobal.prisma.econ_discuss_polls.findUnique({
    where: { econ_discuss_post_id: postId },
    select: { id: true, deleted_at: true },
  });

  // If no poll exists for this post, return 404
  if (!poll) throw new HttpException("Not Found", 404);

  // If already retired, idempotent success
  if (poll.deleted_at !== null) return;

  // 4) Soft delete the poll (set deleted_at and updated_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_polls.update({
    where: { id: poll.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return;
}
