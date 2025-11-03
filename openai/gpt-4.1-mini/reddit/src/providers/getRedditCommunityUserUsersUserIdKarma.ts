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

export async function getRedditCommunityUserUsersUserIdKarma(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUser> {
  const { userId } = props;

  // Verify user exists
  await MyGlobal.prisma.reddit_community_user.findUniqueOrThrow({
    where: { id: userId },
  });

  // Count post upvotes and downvotes
  const [postUpvotes, postDownvotes] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_votes.count({
      where: {
        reddit_community_user_id: userId,
        vote_type: "upvote",
      },
    }),
    MyGlobal.prisma.reddit_community_post_votes.count({
      where: {
        reddit_community_user_id: userId,
        vote_type: "downvote",
      },
    }),
  ]);

  // Count comment upvotes and downvotes
  const [commentUpvotes, commentDownvotes] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_votes.count({
      where: {
        reddit_community_user_id: userId,
        vote_type: "upvote",
      },
    }),
    MyGlobal.prisma.reddit_community_comment_votes.count({
      where: {
        reddit_community_user_id: userId,
        vote_type: "downvote",
      },
    }),
  ]);

  const totalKarma =
    postUpvotes - postDownvotes + (commentUpvotes - commentDownvotes);

  return {
    user_id: userId,
    post_upvotes: postUpvotes,
    post_downvotes: postDownvotes,
    comment_upvotes: commentUpvotes,
    comment_downvotes: commentDownvotes,
    total_karma: totalKarma,
  };
}
