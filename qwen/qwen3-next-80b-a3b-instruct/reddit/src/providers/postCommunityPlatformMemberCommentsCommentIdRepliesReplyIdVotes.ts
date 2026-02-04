import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteCollector } from "../collectors/CommunityPlatformCommentVoteCollector";

export async function postCommunityPlatformMemberCommentsCommentIdRepliesReplyIdVotes(props: {
  member: MemberPayload;
  commentId: string;
  replyId: string;
}): Promise<void> {
  // Verify reply exists and belongs to the specified comment
  const reply = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: {
      id: props.replyId,
    },
  });
  if (!reply) {
    throw new HttpException(
      "Reply not found or does not belong to the specified comment",
      404,
    );
  }
  // Check for existing vote by this member on this reply
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        voter: { id: props.member.id },
        comment: { id: props.replyId },
      },
    });
  if (existingVote) {
    // Toggle vote: if upvote exists, delete it; if downvote exists, convert to upvote
    if (existingVote.vote_type === true) {
      // User previously upvoted - remove vote
      await MyGlobal.prisma.community_platform_comment_votes.delete({
        where: {
          id: existingVote.id,
        },
      });
    } else {
      // User previously downvoted - convert to upvote
      await MyGlobal.prisma.community_platform_comment_votes.update({
        where: {
          id: existingVote.id,
        },
        data: {
          vote_type: true,
        },
      });
    }
  } else {
    // No prior vote - create new upvote
    await MyGlobal.prisma.community_platform_comment_votes.create({
      data: await CommunityPlatformCommentVoteCollector.collect({
        body: { upvote: true },
        communityPlatformComments: { id: props.replyId }, // Vote is on the reply
        communityPlatformMembers: { id: props.member.id },
        communityPlatformMemberSessions: { id: props.member.session_id },
      }),
    });
  }
}
