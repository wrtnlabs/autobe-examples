import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberCommentsCommentIdVotesCommentVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
    },
    select: {
      id: true,
    },
  });
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: {
        id: props.commentVoteId,
      },
      select: {
        id: true,
        community_platform_comment_id: true,
        community_platform_member_id: true,
      },
    });
  if (vote.community_platform_comment_id !== props.commentId) {
    throw new HttpException("Not Found", 404);
  }
  if (vote.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_comment_votes.delete({
    where: {
      id: vote.id,
    },
  });
}
