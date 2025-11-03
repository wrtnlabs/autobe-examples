import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putRedditCommunityUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityUser.IUpdate;
}): Promise<IRedditCommunityUser> {
  const { user, userId, body } = props;

  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own profile",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_user.findUniqueOrThrow({
    where: { id: userId },
  });

  const hashedPassword = body.password
    ? await PasswordUtil.hash(body.password)
    : undefined;

  const updated = await MyGlobal.prisma.reddit_community_user.update({
    where: { id: userId },
    data: {
      email: body.email ?? undefined,
      password_hash: hashedPassword ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    user_id: updated.id,
    post_upvotes: 0,
    post_downvotes: 0,
    comment_upvotes: 0,
    comment_downvotes: 0,
    total_karma: 0,
  };
}
