import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberUsersUserIdFollow(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId } = props;

  // Business rule: cannot follow oneself
  if (member.id === userId) {
    throw new HttpException("Bad Request: You cannot follow yourself", 400);
  }

  // Ensure target user exists and is active (not soft deleted)
  const target = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!target) {
    throw new HttpException("Not Found", 404);
  }

  // Check for existing follow relation
  const existing = await MyGlobal.prisma.econ_discuss_user_follows.findFirst({
    where: {
      follower_user_id: member.id,
      followee_user_id: userId,
    },
    select: { id: true, deleted_at: true },
  });

  if (!existing) {
    const now = toISOStringSafe(new Date());
    try {
      await MyGlobal.prisma.econ_discuss_user_follows.create({
        data: {
          id: v4(),
          follower_user_id: member.id,
          followee_user_id: userId,
          created_at: now,
          deleted_at: null,
        },
      });
    } catch (err) {
      // Handle race condition on unique constraint → idempotent success
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return;
      }
      throw new HttpException("Internal Server Error", 500);
    }
    return;
  }

  // Reinstate if previously soft-deleted
  if (existing.deleted_at !== null) {
    await MyGlobal.prisma.econ_discuss_user_follows.update({
      where: { id: existing.id },
      data: { deleted_at: null },
    });
  }

  // Already active → idempotent no-op
  return;
}
