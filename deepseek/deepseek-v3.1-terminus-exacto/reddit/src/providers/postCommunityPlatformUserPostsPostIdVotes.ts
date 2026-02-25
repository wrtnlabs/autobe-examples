import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostVoteCollector } from "../collectors/CommunityPlatformPostVoteCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserPostsPostIdVotes(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  // Verify post exists and user is not voting on their own post
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, user_id: true },
    },
  );
  if (post.user_id === props.user.id) {
    throw new HttpException("Users cannot vote on their own posts", 400);
  }
  // Use upsert to handle create or update in single operation
  const voteData = await CommunityPlatformPostVoteCollector.collect({
    body: props.body,
    communityPlatformUsers: { id: props.user.id },
    communityPlatformPosts: { id: props.postId },
  });
  const vote = await MyGlobal.prisma.community_platform_post_votes.upsert({
    where: {
      user_id_post_id: {
        user_id: props.user.id,
        post_id: props.postId,
      },
    },
    update: {
      vote_type: props.body.vote_type,
      updated_at: new Date(),
    },
    create: voteData,
    ...CommunityPlatformPostVoteTransformer.select(),
  });
  return await CommunityPlatformPostVoteTransformer.transform(vote);
}
