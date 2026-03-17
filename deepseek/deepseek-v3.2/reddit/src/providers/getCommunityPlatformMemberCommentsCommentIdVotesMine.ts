import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommentsCommentIdVotesMine(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  // Verify comment exists
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: { id: props.commentId, deleted_at: null },
  });
  // Find member's vote on this comment
  const vote = await MyGlobal.prisma.community_platform_comment_votes.findFirst(
    {
      where: {
        community_platform_member_id: props.member.id,
        community_platform_comment_id: props.commentId,
        deleted_at: null,
      },
      ...CommunityPlatformCommentVoteTransformer.select(),
    },
  );
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  return await CommunityPlatformCommentVoteTransformer.transform(vote);
}
