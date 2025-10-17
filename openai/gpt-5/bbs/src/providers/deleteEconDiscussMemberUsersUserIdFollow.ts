import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconDiscussMemberUsersUserIdFollow(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId } = props;

  // Business rule: prevent unfollowing oneself
  if (member.id === userId) {
    throw new HttpException("Bad Request: You cannot unfollow yourself.", 400);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Soft-delete (retire) the follow relationship if active
  await MyGlobal.prisma.econ_discuss_user_follows.updateMany({
    where: {
      follower_user_id: member.id,
      followee_user_id: userId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });

  // Idempotent: even if nothing was updated, treat as success (204)
  return;
}
