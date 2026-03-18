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

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const vote = await tx.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        comment_id: true,
        voter_id: true,
      },
    });
    if (vote.comment_id !== props.commentId) {
      throw new HttpException("Not Found", 404);
    }
    const comment = await tx.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
      },
    });
    if (comment.community_platform_post_id !== props.postId) {
      throw new HttpException("Not Found", 404);
    }
    if (vote.voter_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    await tx.community_platform_comment_votes.delete({
      where: { id: props.voteId },
    });
  });
}
