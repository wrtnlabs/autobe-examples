import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberPostsPostIdCommentsCommentIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IVote;
}): Promise<IRedditCloneComment.IVoteResult> {
  const { member, postId, commentId, body } = props;
  const voteValue = body.value;
  // Use transaction for atomic vote processing
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Query the comment and verify it belongs to the post
    const comment = await tx.reddit_clone_comments.findUniqueOrThrow({
      where: {
        id: commentId,
        reddit_clone_post_id: postId,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_clone_member_id: true,
        score: true,
      },
    });
    // 2. Get the post to find community_id
    const post = await tx.reddit_clone_posts.findUniqueOrThrow({
      where: { id: postId },
      select: {
        reddit_clone_community_id: true,
      },
    });
    const communityId = post.reddit_clone_community_id;
    // 3. Check if user is banned from this community
    const ban = await tx.reddit_clone_bans.findFirst({
      where: {
        community_id: communityId,
        member_id: member.id,
        lifted_at: null,
        deleted_at: null,
      },
    });
    // If banned, return success without recording vote
    if (ban) {
      const author = await tx.reddit_clone_members.findUniqueOrThrow({
        where: { id: comment.reddit_clone_member_id },
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_uri: true,
          karma: true,
          created_at: true,
        },
      });
      return {
        voteValue: voteValue,
        commentScore: comment.score,
        karmaChange: 0,
        commentAuthor: {
          id: author.id,
          username: author.username,
          display_name: author.display_name,
          avatar_uri: author.avatar_uri ?? null,
          karma: author.karma,
          created_at: author.created_at.toISOString(),
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditCloneComment.IVoteResult;
    }
    // 4. Get author info
    const authorId = comment.reddit_clone_member_id;
    const author = await tx.reddit_clone_members.findUniqueOrThrow({
      where: { id: authorId },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_uri: true,
        karma: true,
        created_at: true,
      },
    });
    // 5. Calculate score and karma changes
    // Note: Without a votes table, we cannot track individual user votes
    // This implementation assumes each vote is independent
    // In a production system, a votes table would be needed for proper vote tracking
    const karmaChange = voteValue;
    const newCommentScore = comment.score + voteValue;
    // 6. Update comment score
    await tx.reddit_clone_comments.update({
      where: { id: commentId },
      data: {
        score: newCommentScore,
      },
    });
    // 7. Update author karma
    await tx.reddit_clone_members.update({
      where: { id: authorId },
      data: {
        karma: {
          increment: karmaChange,
        },
      },
    });
    // 8. Get updated author info for response
    const updatedAuthor = await tx.reddit_clone_members.findUniqueOrThrow({
      where: { id: authorId },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_uri: true,
        karma: true,
        created_at: true,
      },
    });
    return {
      voteValue: voteValue,
      commentScore: newCommentScore,
      karmaChange: karmaChange,
      commentAuthor: {
        id: updatedAuthor.id,
        username: updatedAuthor.username,
        display_name: updatedAuthor.display_name,
        avatar_uri: updatedAuthor.avatar_uri ?? null,
        karma: updatedAuthor.karma,
        created_at: updatedAuthor.created_at.toISOString(),
      } satisfies IRedditCloneMember.ISummary,
    } satisfies IRedditCloneComment.IVoteResult;
  });
  return result;
}
