import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditLikeAdminUsersUserIdProfile(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.IProfileUpdate;
}): Promise<IRedditLikeUser.IProfile> {
  const { admin, userId, body } = props;

  // Authorization: Verify admin can only update their own profile
  if (admin.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own profile",
      403,
    );
  }

  // Update user profile
  const updated = await MyGlobal.prisma.reddit_like_users.update({
    where: { id: userId },
    data: {
      profile_bio: body.profile_bio ?? undefined,
      avatar_url: body.avatar_url ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated profile
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
