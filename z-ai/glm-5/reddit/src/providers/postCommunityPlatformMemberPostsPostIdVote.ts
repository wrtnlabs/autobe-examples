import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  // 1. Verify post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  // 2. Check for existing vote (unique constraint [post_id, member_id])
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findUnique({
      where: {
        post_id_member_id: {
          post_id: props.postId,
          member_id: props.member.id,
        },
      },
    });
  if (existingVote !== null) {
    throw new HttpException(
      "You have already voted on this post. Use PUT to update your vote.",
      409,
    );
  }
  // 3. Create new vote record
  const vote = await MyGlobal.prisma.community_platform_post_votes.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      post_id: props.postId,
      vote_type: props.body.voteType,
      created_at: new Date(),
      updated_at: new Date(),
    },
    select: {
      id: true,
      member_id: true,
      post_id: true,
      vote_type: true,
      created_at: true,
      updated_at: true,
      member: {
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          karma: true,
          created_at: true,
        },
      } satisfies Prisma.community_platform_membersFindManyArgs,
    },
  });
  // 4. Transform and return
  return {
    id: vote.id,
    targetType: "post",
    targetId: vote.post_id,
    member: await CommunityPlatformMemberAtSummaryTransformer.transform(
      vote.member,
    ),
    voteType: vote.vote_type,
    createdAt: vote.created_at.toISOString(),
    updatedAt: vote.updated_at.toISOString(),
  };
}
