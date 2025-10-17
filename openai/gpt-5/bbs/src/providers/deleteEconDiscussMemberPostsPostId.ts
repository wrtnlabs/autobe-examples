import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId } = props;

  const post = await MyGlobal.prisma.econ_discuss_posts.findUnique({
    where: { id: postId },
    select: { id: true, econ_discuss_user_id: true, deleted_at: true },
  });

  if (!post) {
    throw new HttpException("Not Found", 404);
  }

  const isOwner = post.econ_discuss_user_id === member.id;

  let privileged = false;
  if (!isOwner) {
    const [moderator, admin] = await Promise.all([
      MyGlobal.prisma.econ_discuss_moderators.findFirst({
        where: {
          user_id: member.id,
          deleted_at: null,
          user: { is: { deleted_at: null } },
        },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_admins.findFirst({
        where: {
          user_id: member.id,
          deleted_at: null,
          user: { is: { deleted_at: null } },
        },
        select: { id: true },
      }),
    ]);
    privileged = Boolean(moderator || admin);
  }

  if (!isOwner && !privileged) {
    throw new HttpException("Forbidden", 403);
  }

  if (post.deleted_at !== null) {
    return; // idempotent success
  }

  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_discuss_posts.update({
    where: { id: post.id },
    data: { deleted_at: now },
  });
}
