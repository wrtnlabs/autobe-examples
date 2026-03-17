import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberPostsPostIdVotesMine(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  // Verify the post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Query the member's vote on this post
  const vote = await MyGlobal.prisma.community_platform_post_votes.findFirst({
    where: {
      community_platform_member_id: props.member.id,
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
    ...CommunityPlatformPostVoteTransformer.select(),
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  // Transform and return the vote
  return await CommunityPlatformPostVoteTransformer.transform(vote);
}
