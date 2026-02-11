import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityVoteCollector } from "../collectors/CommunityVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityVoteTransformer } from "../transformers/CommunityVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string;
  body: ICommunityVote.ICreate;
}): Promise<ICommunityVote> {
  // Check post exists
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  const existingVote = await MyGlobal.prisma.community_votes.findFirst({
    where: {
      user_id: props.member.id,
      post_id: props.postId,
      deleted_at: null,
    },
  });
  if (existingVote) {
    if (existingVote.type === props.body.type) {
      // No change
      const vote = await MyGlobal.prisma.community_votes.findUnique({
        where: { id: existingVote.id },
        ...CommunityVoteTransformer.select(),
      });
      return await CommunityVoteTransformer.transform(vote!);
    }
    // Update existing vote
    await MyGlobal.prisma.community_votes.update({
      where: { id: existingVote.id },
      data: {
        type: props.body.type,
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    const updatedVote = await MyGlobal.prisma.community_votes.findUnique({
      where: { id: existingVote.id },
      ...CommunityVoteTransformer.select(),
    });
    return await CommunityVoteTransformer.transform(updatedVote!);
  }
  // Create new vote
  const input = await CommunityVoteCollector.collect({
    body: props.body,
    communityMembers: { id: props.member.id },
    communityPosts: { id: props.postId },
  });
  const created = await MyGlobal.prisma.community_votes.create({
    data: input,
    ...CommunityVoteTransformer.select(),
  });
  return await CommunityVoteTransformer.transform(created);
}
