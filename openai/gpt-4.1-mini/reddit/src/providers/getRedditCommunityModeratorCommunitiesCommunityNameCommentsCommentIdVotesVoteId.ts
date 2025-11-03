import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorCommunitiesCommunityNameCommentsCommentIdVotesVoteId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentVote> {
  const { moderator, communityName, commentId, voteId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
    });
  if (!community)
    throw new HttpException(`Community '${communityName}' not found`, 404);

  const membership =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        reddit_community_community_id: community.id,
        reddit_community_moderator_id: moderator.id,
      },
    });
  if (!membership)
    throw new HttpException(
      `Forbidden: Moderator not part of community '${communityName}'`,
      403,
    );

  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: commentId },
  });
  if (!comment) throw new HttpException(`Comment not found`, 404);

  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: comment.reddit_community_post_id },
  });
  if (!post || post.reddit_community_community_id !== community.id) {
    throw new HttpException(
      `Comment does not belong to community '${communityName}'`,
      404,
    );
  }

  const vote = await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
    where: { id: voteId },
  });
  if (!vote) throw new HttpException(`Vote not found`, 404);
  if (
    vote.reddit_community_comment_id !== comment.id ||
    vote.reddit_community_community_id !== community.id
  ) {
    throw new HttpException(
      `Vote does not belong to specified comment or community`,
      404,
    );
  }

  return {
    id: vote.id,
    reddit_community_comment_id: vote.reddit_community_comment_id,
    reddit_community_user_id: vote.reddit_community_user_id,
    reddit_community_community_id: vote.reddit_community_community_id,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
