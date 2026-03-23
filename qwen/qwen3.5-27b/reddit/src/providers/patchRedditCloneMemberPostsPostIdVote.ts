import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostTransformer } from "../transformers/RedditClonePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IVoteRequest;
}): Promise<IRedditClonePost> {
  // Find the post and verify it exists and is not deleted
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_clone_community_id: true,
      reddit_clone_members_id: true,
      score: true,
    },
  });
  // Check if the member is banned from the community
  const ban = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      community_id: post.reddit_clone_community_id,
      member_id: props.member.id,
      lifted_at: null,
      deleted_at: null,
    },
  });
  // If banned, silently ignore the vote attempt
  if (ban !== null) {
    // Return the post as-is without recording the vote
    const fullPost = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow(
      {
        where: { id: props.postId },
        ...RedditClonePostTransformer.select(),
      },
    );
    return await RedditClonePostTransformer.transform(fullPost);
  }
  // Calculate the score delta and karma delta
  const voteValue = props.body.value;
  const scoreDelta = voteValue;
  const karmaDelta = voteValue;
  // If vote value is 0, no update needed (removing vote has no effect without vote tracking)
  if (voteValue === 0) {
    const fullPost = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow(
      {
        where: { id: props.postId },
        ...RedditClonePostTransformer.select(),
      },
    );
    return await RedditClonePostTransformer.transform(fullPost);
  }
  // Update post score and author karma atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        score: {
          increment: scoreDelta,
        },
      },
    }),
    MyGlobal.prisma.reddit_clone_members.update({
      where: { id: post.reddit_clone_members_id },
      data: {
        karma: {
          increment: karmaDelta,
        },
      },
    }),
  ]);
  // Return the updated post
  const updatedPost =
    await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...RedditClonePostTransformer.select(),
    });
  return await RedditClonePostTransformer.transform(updatedPost);
}
