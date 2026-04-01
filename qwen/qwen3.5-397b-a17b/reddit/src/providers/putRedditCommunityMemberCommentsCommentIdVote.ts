import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
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

export async function putRedditCommunityMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IUpdate;
}): Promise<IRedditCommunityCommentVote> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, deleted_at: true },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 404);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
      where: {
        reddit_community_member_id_reddit_community_comment_id: {
          reddit_community_member_id: props.member.id,
          reddit_community_comment_id: props.commentId,
        },
      },
    });
  if (props.body.direction === null || props.body.direction === undefined) {
    if (existingVote) {
      await MyGlobal.prisma.reddit_community_comment_votes.delete({
        where: { id: existingVote.id },
      });
    }
    throw new HttpException("Vote removed", 204);
  }
  let voteId: string & tags.Format<"uuid">;
  if (existingVote) {
    await MyGlobal.prisma.reddit_community_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
      },
    });
    voteId = existingVote.id;
  } else {
    const created = await MyGlobal.prisma.reddit_community_comment_votes.create(
      {
        data: {
          id: v4(),
          reddit_community_member_id: props.member.id,
          reddit_community_comment_id: props.commentId,
          direction: props.body.direction,
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
    );
    voteId = created.id;
  }
  const vote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUniqueOrThrow({
      where: { id: voteId },
      ...RedditCommunityCommentVoteTransformer.select(),
    });
  return await RedditCommunityCommentVoteTransformer.transform(vote);
}
