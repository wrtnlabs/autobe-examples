import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

export async function getRedditLikeUsersUserIdProfile(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeUser.IProfile> {
  const { userId } = props;

  const user = await MyGlobal.prisma.reddit_like_users.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      profile_bio: true,
      avatar_url: true,
      post_karma: true,
      comment_karma: true,
      created_at: true,
    },
  });

  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    profile_bio: user.profile_bio === null ? undefined : user.profile_bio,
    avatar_url: user.avatar_url === null ? undefined : user.avatar_url,
    post_karma: user.post_karma,
    comment_karma: user.comment_karma,
    created_at: toISOStringSafe(user.created_at),
  };
}
