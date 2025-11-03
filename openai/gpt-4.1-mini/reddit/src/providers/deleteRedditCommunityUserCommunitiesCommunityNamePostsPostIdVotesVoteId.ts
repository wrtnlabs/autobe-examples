import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteRedditCommunityUserCommunitiesCommunityNamePostsPostIdVotesVoteId(props: {
  user: UserPayload;
  communityName: string;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, communityName, voteId } = props;

  // Find vote by id
  const vote = await MyGlobal.prisma.reddit_community_post_votes.findUnique({
    where: { id: voteId },
    select: {
      id: true,
      reddit_community_user_id: true,
      reddit_community_community_id: true,
    },
  });

  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }

  // Verify community name matches the community id of the vote
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        id: vote.reddit_community_community_id,
        name: communityName,
      },
    });

  if (!community) {
    throw new HttpException("Community not found or mismatched", 404);
  }

  // Authorize deletion (only vote owner)
  if (vote.reddit_community_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: Only vote owner can delete the vote",
      403,
    );
  }

  // Hard delete the vote
  await MyGlobal.prisma.reddit_community_post_votes.delete({
    where: { id: voteId },
  });
}
