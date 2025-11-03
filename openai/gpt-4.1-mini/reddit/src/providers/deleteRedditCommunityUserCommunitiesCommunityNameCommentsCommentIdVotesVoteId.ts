import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteRedditCommunityUserCommunitiesCommunityNameCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
  communityName: string;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, communityName, commentId, voteId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (community === null) {
    throw new HttpException("Community not found", 404);
  }

  const vote = await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
    where: {
      id: voteId,
      reddit_community_comment_id: commentId,
      reddit_community_community_id: community.id,
      reddit_community_user_id: user.id,
    },
  });

  if (vote === null) {
    throw new HttpException("Vote not found or access denied", 404);
  }

  await MyGlobal.prisma.reddit_community_comment_votes.delete({
    where: { id: voteId },
  });
}
