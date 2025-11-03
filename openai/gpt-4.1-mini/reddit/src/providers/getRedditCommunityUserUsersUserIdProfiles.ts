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

export async function getRedditCommunityUserUsersUserIdProfiles(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUser> {
  const { userId } = props;

  const userRecord = await MyGlobal.prisma.reddit_community_user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (userRecord === null) {
    throw new HttpException("User not found", 404);
  }

  const [postUpvotes, postDownvotes, commentUpvotes, commentDownvotes] =
    await Promise.all([
      MyGlobal.prisma.reddit_community_post_votes.count({
        where: { reddit_community_user_id: userId, vote_type: "upvote" },
      }),
      MyGlobal.prisma.reddit_community_post_votes.count({
        where: { reddit_community_user_id: userId, vote_type: "downvote" },
      }),
      MyGlobal.prisma.reddit_community_comment_votes.count({
        where: { reddit_community_user_id: userId, vote_type: "upvote" },
      }),
      MyGlobal.prisma.reddit_community_comment_votes.count({
        where: { reddit_community_user_id: userId, vote_type: "downvote" },
      }),
    ]);

  const total_karma =
    postUpvotes + commentUpvotes - postDownvotes - commentDownvotes;

  return {
    user_id: userRecord.id,
    post_upvotes: postUpvotes,
    post_downvotes: postDownvotes,
    comment_upvotes: commentUpvotes,
    comment_downvotes: commentDownvotes,
    total_karma,
  };
}
