import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentVoteTransformer } from "../transformers/RedditCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IUpdate;
}): Promise<IRedditCommunityCommentVote> {
  const vote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        member_id: true,
        comment_id: true,
        deleted_at: true,
      },
    });
  if (vote.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (vote.comment_id !== props.commentId) {
    throw new HttpException("Bad request", 400);
  }
  if (props.body.value === undefined) {
    throw new HttpException("Value is required", 400);
  }
  if (props.body.value !== 1 && props.body.value !== -1) {
    throw new HttpException("Value must be +1 or -1", 400);
  }
  await MyGlobal.prisma.reddit_community_comment_votes.update({
    where: { id: props.voteId },
    data: {
      value: props.body.value,
      deleted_at: null,
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_community_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...RedditCommunityCommentVoteTransformer.select(),
    });
  return await RedditCommunityCommentVoteTransformer.transform(updated);
}
