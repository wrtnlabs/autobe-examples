import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteTransformer } from "../transformers/CommunityPlatformVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVote> {
  // Verify comment exists and is not deleted
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Find the member's vote on this comment
  const vote = await MyGlobal.prisma.community_platform_votes.findUniqueOrThrow(
    {
      where: {
        comment_id_member_id: {
          comment_id: props.commentId,
          member_id: props.member.id,
        },
      },
      ...CommunityPlatformVoteTransformer.select(),
    },
  );
  return await CommunityPlatformVoteTransformer.transform(vote);
}
