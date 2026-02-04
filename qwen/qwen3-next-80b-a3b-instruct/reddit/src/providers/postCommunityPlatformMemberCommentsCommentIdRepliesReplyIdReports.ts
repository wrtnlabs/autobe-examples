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
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberCommentsCommentIdRepliesReplyIdReports(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.IRequest;
}): Promise<ICommunityPlatformCommentReport> {
  // Verify comment exists
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify reply exists and belongs to comment
  const reply = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.replyId, parent_id: props.commentId },
  });
  if (!reply) {
    throw new HttpException("Reply not found", 404);
  }
  // Ensure reporter is not the owner of the reply
  if (reply.author_id === props.member.id) {
    throw new HttpException("Cannot report your own content", 400);
  }
  // Create report - use system defaults for required fields since IRequest is empty
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reporter: { connect: { id: props.member.id } },
        reportedComment: { connect: { id: props.replyId } },
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        // The database requires 'reason' and 'status', but API's IRequest is empty
        // This indicates these should be system-generated, not client-provided
        // Use reasonable defaults based on business context
        reason: "Reported for policy violation",
        status: "pending",
      },
    });
  // Return report matching interface - reporter and reportedComment are null per schema, since their summary types are empty objects
  return {
    comment_id: report.comment_id,
    reporter: null, // Per ICommunityPlatformCommentReport definition, reporter is null when summary is empty
    reportedComment: null, // Per ICommunityPlatformCommentReport definition, reportedComment is null when summary is empty
    id: report.id,
  };
}
