import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommentVoteCollector } from "../collectors/RedditPlatformCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentVoteTransformer } from "../transformers/RedditPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommentVote.ICreate;
}): Promise<IRedditPlatformCommentVote> {
  // 1. Verify comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.reddit_platform_comments.findFirst({
    where: {
      id: props.commentId,
      reddit_platform_post_id: props.postId,
      deleted_at: null,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  // 2. Check member is not the comment author (prevent self-voting)
  if (comment.reddit_platform_member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // 3. Handle vote operation using collector
  const voteData = await RedditPlatformCommentVoteCollector.collect({
    body: props.body,
    redditPlatformMembers: { id: props.member.id },
    redditPlatformComments: { id: props.commentId },
  });
  // 4. Upsert vote record (create if not exists, update if exists)
  const vote = await MyGlobal.prisma.reddit_platform_comment_votes.upsert({
    where: {
      reddit_platform_member_id_reddit_platform_comments_id: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_comments_id: props.commentId,
      },
    },
    update: {
      vote_type: props.body.vote_type,
      updated_at: new Date(),
    },
    create: voteData,
    ...RedditPlatformCommentVoteTransformer.select(),
  });
  // 5. Return transformed vote record
  return await RedditPlatformCommentVoteTransformer.transform(vote);
}
