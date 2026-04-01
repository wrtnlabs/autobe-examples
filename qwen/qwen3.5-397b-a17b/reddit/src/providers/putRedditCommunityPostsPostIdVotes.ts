import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostVoteTransformer } from "../transformers/RedditCommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityPostsPostIdVotes(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IUpdate;
}): Promise<IRedditCommunityPostVote> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, reddit_community_member_id: true },
  });
  const member =
    await MyGlobal.prisma.reddit_community_members.findFirstOrThrow({
      where: { deleted_at: null },
      select: { id: true },
    });
  if (post.reddit_community_member_id === member.id) {
    throw new HttpException("Cannot vote on your own post", 400);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        reddit_community_member_id: member.id,
        reddit_community_post_id: props.postId,
        deleted_at: null,
      },
    });
  if (props.body.direction === null || props.body.direction === undefined) {
    if (existingVote) {
      await MyGlobal.prisma.reddit_community_post_votes.update({
        where: { id: existingVote.id },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });
      const postAuthorProfile =
        await MyGlobal.prisma.reddit_community_user_profiles.findFirstOrThrow({
          where: {
            reddit_community_member_id: post.reddit_community_member_id,
          },
          select: { id: true, karma_score: true },
        });
      const karmaChange = existingVote.direction === "UPVOTE" ? -1 : 1;
      await MyGlobal.prisma.reddit_community_user_profiles.update({
        where: { id: postAuthorProfile.id },
        data: {
          karma_score: postAuthorProfile.karma_score + karmaChange,
        },
      });
      const softDeletedVote =
        await MyGlobal.prisma.reddit_community_post_votes.findUniqueOrThrow({
          where: { id: existingVote.id },
          ...RedditCommunityPostVoteTransformer.select(),
        });
      return await RedditCommunityPostVoteTransformer.transform(
        softDeletedVote,
      );
    }
    throw new HttpException("No active vote found to remove", 404);
  }
  const directionValue = props.body.direction === "UPVOTE" ? 1 : -1;
  const previousDirectionValue = existingVote
    ? existingVote.direction === "UPVOTE"
      ? 1
      : -1
    : 0;
  const karmaDelta = directionValue - previousDirectionValue;
  if (existingVote) {
    const updated = await MyGlobal.prisma.reddit_community_post_votes.update({
      where: { id: existingVote.id },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
      },
      ...RedditCommunityPostVoteTransformer.select(),
    });
    const postAuthorProfile =
      await MyGlobal.prisma.reddit_community_user_profiles.findFirstOrThrow({
        where: {
          reddit_community_member_id: post.reddit_community_member_id,
        },
        select: { id: true, karma_score: true },
      });
    await MyGlobal.prisma.reddit_community_user_profiles.update({
      where: { id: postAuthorProfile.id },
      data: {
        karma_score: postAuthorProfile.karma_score + karmaDelta,
      },
    });
    return await RedditCommunityPostVoteTransformer.transform(updated);
  }
  const created = await MyGlobal.prisma.reddit_community_post_votes.create({
    data: {
      id: v4(),
      reddit_community_member_id: member.id,
      reddit_community_post_id: props.postId,
      direction: props.body.direction,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...RedditCommunityPostVoteTransformer.select(),
  });
  const postAuthorProfile =
    await MyGlobal.prisma.reddit_community_user_profiles.findFirstOrThrow({
      where: {
        reddit_community_member_id: post.reddit_community_member_id,
      },
      select: { id: true, karma_score: true },
    });
  await MyGlobal.prisma.reddit_community_user_profiles.update({
    where: { id: postAuthorProfile.id },
    data: {
      karma_score: postAuthorProfile.karma_score + directionValue,
    },
  });
  return await RedditCommunityPostVoteTransformer.transform(created);
}
