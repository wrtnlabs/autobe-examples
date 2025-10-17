import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

export async function getRedditLikeUsersUserIdKarma(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeUser.IKarma> {
  const { userId } = props;

  const user = await MyGlobal.prisma.reddit_like_users.findUniqueOrThrow({
    where: { id: userId },
    select: {
      post_karma: true,
      comment_karma: true,
    },
  });

  return {
    post_karma: user.post_karma,
    comment_karma: user.comment_karma,
    total_karma: user.post_karma + user.comment_karma,
  };
}
