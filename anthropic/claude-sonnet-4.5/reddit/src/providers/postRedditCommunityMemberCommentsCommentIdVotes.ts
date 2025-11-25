import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  const now = new Date();
  const vote = await MyGlobal.prisma.reddit_community_comment_votes.upsert({
    where: {
      reddit_community_member_id_reddit_community_comment_id: {
        reddit_community_member_id: props.member.id,
        reddit_community_comment_id: props.commentId,
      },
    },
    create: {
      id: v4() satisfies string as string,
      reddit_community_comment_id: props.commentId,
      reddit_community_member_id: props.member.id,
      vote_type: props.body.vote_type,
      created_at: now,
      updated_at: now,
    },
    update: {
      vote_type: props.body.vote_type,
      updated_at: now,
    },
  });

  return {
    id: vote.id satisfies string as string,
    reddit_community_comment_id:
      vote.reddit_community_comment_id satisfies string as string,
    reddit_community_member_id:
      vote.reddit_community_member_id satisfies string as string,
    vote_type: vote.vote_type as 1 | -1,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
