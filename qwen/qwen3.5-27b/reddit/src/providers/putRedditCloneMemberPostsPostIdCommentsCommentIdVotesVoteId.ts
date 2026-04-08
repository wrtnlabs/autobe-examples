import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentVoteTransformer } from "../transformers/RedditCloneCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCloneCommentVote.IUpdate;
}): Promise<IRedditCloneCommentVote> {
  // Verify vote exists, belongs to member, and comment is not deleted
  await MyGlobal.prisma.reddit_clone_comment_votes.findUniqueOrThrow({
    where: {
      id: props.voteId,
      reddit_clone_member_id: props.member.id,
      comment: {
        id: props.commentId,
        deleted_at: null,
      },
    },
    select: { id: true },
  });
  // Update the vote type and timestamp
  await MyGlobal.prisma.reddit_clone_comment_votes.update({
    where: { id: props.voteId },
    data: {
      vote_type: props.body.vote_type,
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated vote
  const updated =
    await MyGlobal.prisma.reddit_clone_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...RedditCloneCommentVoteTransformer.select(),
    });
  return await RedditCloneCommentVoteTransformer.transform(updated);
}
