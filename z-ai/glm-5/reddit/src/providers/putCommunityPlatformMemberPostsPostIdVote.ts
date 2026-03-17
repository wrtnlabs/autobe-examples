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

export async function putCommunityPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  // Validate post exists and not deleted
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  // Check if vote exists
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findUnique({
      where: {
        post_id_member_id: {
          post_id: props.postId,
          member_id: props.member.id,
        },
      },
    });
  const now = new Date();
  let voteRecord;
  const selectClause = {
    id: true,
    post_id: true,
    vote_type: true,
    created_at: true,
    updated_at: true,
    member: CommunityPlatformMemberAtSummaryTransformer.select(),
  } satisfies Prisma.community_platform_post_votesSelect;
  if (existingVote) {
    // Update existing vote
    voteRecord = await MyGlobal.prisma.community_platform_post_votes.update({
      where: {
        id: existingVote.id,
      },
      data: {
        vote_type: props.body.vote_type,
        updated_at: now,
      },
      select: selectClause,
    });
  } else {
    // Create new vote
    voteRecord = await MyGlobal.prisma.community_platform_post_votes.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        post_id: props.postId,
        vote_type: props.body.vote_type,
        created_at: now,
        updated_at: now,
      },
      select: selectClause,
    });
  }
  return {
    id: voteRecord.id,
    targetType: "post",
    targetId: voteRecord.post_id,
    member: await CommunityPlatformMemberAtSummaryTransformer.transform(
      voteRecord.member,
    ),
    voteType: voteRecord.vote_type,
    createdAt: voteRecord.created_at.toISOString(),
    updatedAt: voteRecord.updated_at.toISOString(),
  };
}
