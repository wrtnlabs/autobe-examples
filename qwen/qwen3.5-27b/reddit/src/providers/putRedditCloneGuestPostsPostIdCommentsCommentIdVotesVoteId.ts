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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCloneCommentVoteTransformer } from "../transformers/RedditCloneCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneGuestPostsPostIdCommentsCommentIdVotesVoteId(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCloneCommentVote.IUpdate;
}): Promise<IRedditCloneCommentVote> {
  const vote =
    await MyGlobal.prisma.reddit_clone_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        comment: {
          select: { deleted_at: true },
        },
      },
    });
  if (vote.comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  if (vote.reddit_clone_member_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.reddit_clone_comment_votes.update({
    where: { id: props.voteId },
    data: {
      vote_type: props.body.vote_type ?? null,
      updated_at: new Date(),
    },
    ...RedditCloneCommentVoteTransformer.select(),
  });
  return await RedditCloneCommentVoteTransformer.transform(updated);
}
