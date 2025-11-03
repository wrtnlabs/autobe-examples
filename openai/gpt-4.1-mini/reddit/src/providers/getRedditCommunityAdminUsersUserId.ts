import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUser> {
  const { userId } = props;

  // Verify the user exists
  await MyGlobal.prisma.reddit_community_user.findUniqueOrThrow({
    where: { id: userId },
  });

  // Count post upvotes and downvotes
  const postUpvotes = await MyGlobal.prisma.reddit_community_post_votes.count({
    where: { reddit_community_user_id: userId, vote_type: "upvote" },
  });
  const postDownvotes = await MyGlobal.prisma.reddit_community_post_votes.count(
    {
      where: { reddit_community_user_id: userId, vote_type: "downvote" },
    },
  );

  // Count comment upvotes and downvotes
  const commentUpvotes =
    await MyGlobal.prisma.reddit_community_comment_votes.count({
      where: { reddit_community_user_id: userId, vote_type: "upvote" },
    });
  const commentDownvotes =
    await MyGlobal.prisma.reddit_community_comment_votes.count({
      where: { reddit_community_user_id: userId, vote_type: "downvote" },
    });

  // Calculate total karma
  const totalKarma =
    postUpvotes + commentUpvotes - postDownvotes - commentDownvotes;

  return {
    user_id: userId,
    post_upvotes: postUpvotes,
    post_downvotes: postDownvotes,
    comment_upvotes: commentUpvotes,
    comment_downvotes: commentDownvotes,
    total_karma: totalKarma,
  };
}
