import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postRedditCommunityUserCommunitiesCommunityNameCommentsCommentIdVotes(props: {
  user: UserPayload;
  communityName: string;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  const { user, communityName, commentId, body } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: { name: communityName, deleted_at: null },
      select: { id: true },
    });

  if (!community)
    throw new HttpException(`Community '${communityName}' not found`, 404);

  const comment = await MyGlobal.prisma.reddit_community_comments.findFirst({
    where: {
      id: commentId,
      reddit_community_post_id: community.id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!comment)
    throw new HttpException(
      `Comment '${commentId}' not found in community '${communityName}'`,
      404,
    );

  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findFirst({
      where: {
        reddit_community_comment_id: commentId,
        reddit_community_user_id: user.id,
      },
    });

  if (existingVote)
    throw new HttpException(
      "Duplicate vote: user has already voted on this comment",
      409,
    );

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.reddit_community_comment_votes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_comment_id: body.reddit_community_comment_id,
      reddit_community_user_id: user.id,
      reddit_community_community_id: community.id,
      vote_type: body.vote_type,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    reddit_community_comment_id: created.reddit_community_comment_id,
    reddit_community_user_id: created.reddit_community_user_id,
    reddit_community_community_id: created.reddit_community_community_id,
    vote_type: created.vote_type,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
