import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberPostsPostIdLive(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1) Locate active live thread for the post (soft-delete aware)
  const thread = await MyGlobal.prisma.econ_discuss_live_threads.findFirst({
    where: {
      econ_discuss_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      host_user_id: true,
    },
  });

  if (thread === null) {
    // Ensure the post exists; if not, 404. If it exists, treat as idempotent success
    const post = await MyGlobal.prisma.econ_discuss_posts.findUnique({
      where: { id: props.postId },
      select: { id: true },
    });
    if (post === null) {
      throw new HttpException("Not Found", 404);
    }
    return;
  }

  // 2) Authorization: host or active moderator/admin
  const isHost = thread.host_user_id === props.member.id;
  if (!isHost) {
    const [moderator, admin] = await Promise.all([
      MyGlobal.prisma.econ_discuss_moderators.findFirst({
        where: {
          user_id: props.member.id,
          deleted_at: null,
          user: { is: { deleted_at: null } },
        },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_admins.findFirst({
        where: {
          user_id: props.member.id,
          deleted_at: null,
          user: { is: { deleted_at: null } },
        },
        select: { id: true },
      }),
    ]);

    if (moderator === null && admin === null) {
      throw new HttpException("Forbidden", 403);
    }
  }

  // 3) Soft delete the live thread (and update updated_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_live_threads.update({
    where: { id: thread.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
