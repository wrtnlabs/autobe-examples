import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditLikeMemberUsersUserIdProfile(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.IProfileUpdate;
}): Promise<IRedditLikeUser.IProfile> {
  const { member, userId, body } = props;

  // Authorization: verify ownership
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own profile",
      403,
    );
  }

  // Fetch existing user to verify existence and not soft-deleted
  const existingUser =
    await MyGlobal.prisma.reddit_like_users.findUniqueOrThrow({
      where: { id: userId },
    });

  if (existingUser.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  // Update profile
  const updated = await MyGlobal.prisma.reddit_like_users.update({
    where: { id: userId },
    data: {
      profile_bio: body.profile_bio ?? undefined,
      avatar_url: body.avatar_url ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return profile
  return {
    id: updated.id as string & tags.Format<"uuid">,
    username: updated.username,
    profile_bio: updated.profile_bio ?? undefined,
    avatar_url: updated.avatar_url ?? undefined,
    post_karma: updated.post_karma,
    comment_karma: updated.comment_karma,
    created_at: toISOStringSafe(updated.created_at),
  };
}
