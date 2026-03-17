import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityVoteCollector } from "../collectors/RedditCommunityVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityVoteTransformer } from "../transformers/RedditCommunityVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberVotes(props: {
  member: MemberPayload;
  body: IRedditCommunityVote.ICreate;
}): Promise<IRedditCommunityVote> {
  // Validate that exactly one of target_post_id or target_comment_id is provided
  const hasTargetPost =
    props.body.target_post_id !== null &&
    props.body.target_post_id !== undefined;
  const hasTargetComment =
    props.body.target_comment_id !== null &&
    props.body.target_comment_id !== undefined;
  if (hasTargetPost === hasTargetComment) {
    throw new HttpException(
      "Exactly one of target_post_id or target_comment_id must be provided",
      400,
    );
  }
  // Validate target exists and route to correct type check
  let targetAuthorId: string | null = null;
  let targetPostId: string | null = null;
  let targetCommentId: string | null = null;
  if (hasTargetPost) {
    targetPostId = props.body.target_post_id!;
    // Validate post exists
    const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: targetPostId },
      select: { id: true, author_id: true },
    });
    if (!post) {
      throw new HttpException("Post not found", 404);
    }
    targetAuthorId = post.author_id;
  } else {
    targetCommentId = props.body.target_comment_id!;
    // Validate comment exists
    const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: targetCommentId },
      select: { id: true, reddit_community_members_id: true },
    });
    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }
    targetAuthorId = comment.reddit_community_members_id;
  }
  // Check for duplicate vote (member already voted on this target)
  let existingVote: IEntity | null = null;
  if (hasTargetPost) {
    existingVote = await MyGlobal.prisma.reddit_community_votes.findUnique({
      where: {
        member_id_target_post_id: {
          member_id: props.member.id,
          target_post_id: targetPostId!,
        },
      },
    });
  } else {
    existingVote = await MyGlobal.prisma.reddit_community_votes.findUnique({
      where: {
        member_id_target_comment_id: {
          member_id: props.member.id,
          target_comment_id: targetCommentId!,
        },
      },
    });
  }
  if (existingVote) {
    throw new HttpException(
      "Duplicate vote - you can only have one vote per target",
      409,
    );
  }
  // Create vote record
  const created = await MyGlobal.prisma.reddit_community_votes.create({
    data: await RedditCommunityVoteCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id } as IEntity,
    }),
  });
  // Route to appropriate subtype table
  if (hasTargetPost) {
    await MyGlobal.prisma.reddit_community_vote_of_posts.create({
      data: {
        id: created.id,
        vote_id: created.id,
        post_id: targetPostId!,
        created_at: created.created_at,
        updated_at: created.updated_at,
      },
    });
  } else {
    await MyGlobal.prisma.reddit_community_vote_of_comments.create({
      data: {
        id: created.id,
        vote_id: created.id,
        comment_id: targetCommentId!,
        created_at: created.created_at,
        updated_at: created.updated_at,
      },
    });
  }
  // Adjust karma for target's author
  const karmaAdjustment = props.body.vote_type === "upvote" ? 1 : -1;
  const now = new Date();
  await MyGlobal.prisma.reddit_community_user_karmas.upsert({
    where: { reddit_community_member_id: targetAuthorId! },
    update: {
      current_score: {
        increment: karmaAdjustment,
      },
    },
    create: {
      id: v4(),
      reddit_community_member_id: targetAuthorId!,
      current_score: karmaAdjustment,
      created_at: now,
      updated_at: now,
    },
  });
  // Query the created vote with full details
  const vote = await MyGlobal.prisma.reddit_community_votes.findUniqueOrThrow({
    where: { id: created.id },
    ...RedditCommunityVoteTransformer.select(),
  });
  // Transform and return
  return await RedditCommunityVoteTransformer.transform(vote);
}
