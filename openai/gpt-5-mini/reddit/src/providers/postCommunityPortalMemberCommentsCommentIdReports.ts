import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPortalMemberCommentsCommentIdReports(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPortalReport.ICreate;
}): Promise<ICommunityPortalReport> {
  const { member, commentId, body } = props;

  // Verify target comment exists and get related post.community_id for routing
  const comment = await MyGlobal.prisma.community_portal_comments.findUnique({
    where: { id: commentId },
    include: { post: { select: { community_id: true, id: true } } },
  });

  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }

  // Prepare timestamp once
  const createdAt = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.community_portal_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reporter_user_id: member.id,
      community_id: comment.post?.community_id ?? null,
      post_id: comment.post_id,
      comment_id: commentId,
      reason_code: (body as any).reasonCode,
      reason_text: (body as any).reasonText ?? null,
      is_urgent: (body as any).isUrgent ?? false,
      severity: (body as any).severity ?? null,
      reporter_contact_email: (body as any).reporterContactEmail ?? null,
      status: "OPEN",
      created_at: createdAt,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    reporterUserId:
      created.reporter_user_id === null
        ? null
        : (created.reporter_user_id as string & tags.Format<"uuid">),
    communityId:
      created.community_id === null
        ? null
        : (created.community_id as string & tags.Format<"uuid">),
    postId:
      created.post_id === null
        ? null
        : (created.post_id as string & tags.Format<"uuid">),
    commentId: created.comment_id as string & tags.Format<"uuid">,
    assignedModeratorId: created.assigned_moderator_id ?? null,
    closedByModeratorId: created.closed_by_moderator_id ?? null,
    reasonCode: created.reason_code,
    reasonText: created.reason_text ?? null,
    status: created.status,
    isUrgent: created.is_urgent,
    severity: created.severity ?? null,
    reporterContactEmail: created.reporter_contact_email ?? null,
    createdAt: toISOStringSafe(created.created_at),
    reviewedAt: created.reviewed_at
      ? toISOStringSafe(created.reviewed_at)
      : null,
    closedAt: created.closed_at ? toISOStringSafe(created.closed_at) : null,
    resolutionNotes: created.resolution_notes ?? null,
  };
}
