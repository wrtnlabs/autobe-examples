import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostVoteCollector } from "../collectors/RedditClonePostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostVoteTransformer } from "../transformers/RedditClonePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.ICreate;
}): Promise<IRedditClonePostVote> {
  // Validate post exists and is not deleted
  await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  // Check if member already has a vote on this post
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findFirst({
    where: {
      reddit_clone_post_id: props.postId,
      reddit_clone_member_id: props.member.id,
      deleted_at: null,
    },
  });
  let record;
  if (existingVote) {
    // Update existing vote
    record = await MyGlobal.prisma.reddit_clone_post_votes.update({
      where: {
        id: existingVote.id,
      },
      data: {
        vote_type: props.body.vote_type,
        updated_at: new Date(),
      },
      ...RedditClonePostVoteTransformer.select(),
    });
  } else {
    // Create new vote
    record = await MyGlobal.prisma.reddit_clone_post_votes.create({
      data: await RedditClonePostVoteCollector.collect({
        body: props.body,
        redditClonePosts: { id: props.postId },
        redditCloneMembers: { id: props.member.id },
      }),
      ...RedditClonePostVoteTransformer.select(),
    });
  }
  return await RedditClonePostVoteTransformer.transform(record);
}
