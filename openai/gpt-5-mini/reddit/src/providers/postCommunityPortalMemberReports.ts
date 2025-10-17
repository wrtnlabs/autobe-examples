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

export async function postCommunityPortalMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPortalReport.ICreate;
}): Promise<ICommunityPortalReport> {
  const { member, body } = props;

  // At least one target must be provided
  if (
    (body.community_id === undefined || body.community_id === null) &&
    (body.post_id === undefined || body.post_id === null) &&
    (body.comment_id === undefined || body.comment_id === null)
  ) {
    throw new HttpException(
      "At least one target (community_id, post_id, or comment_id) must be provided",
      400,
    );
  }

  // Validate existence of referenced resources if provided
  if (body.community_id !== undefined && body.community_id !== null) {
    const community =
      await MyGlobal.prisma.community_portal_communities.findUnique({
        where: { id: body.community_id },
        select: { id: true },
      });
    if (!community) throw new HttpException("Community not found", 404);
  }

  if (body.post_id !== undefined && body.post_id !== null) {
    const post = await MyGlobal.prisma.community_portal_posts.findUnique({
      where: { id: body.post_id },
      select: { id: true },
    });
    if (!post) throw new HttpException("Post not found", 404);
  }

  if (body.comment_id !== undefined && body.comment_id !== null) {
    const comment = await MyGlobal.prisma.community_portal_comments.findUnique({
      where: { id: body.comment_id },
      select: { id: true },
    });
    if (!comment) throw new HttpException("Comment not found", 404);
  }

  // Prepare server-managed values
  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  // Create record with inline data object (no intermediate vars)
  const created = await MyGlobal.prisma.community_portal_reports.create({
    data: {
      id: newId,
      reporter_user_id: member.id,
      community_id: body.community_id ?? null,
      post_id: body.post_id ?? null,
      comment_id: body.comment_id ?? null,
      reason_code: (body as any).reason_code,
      reason_text: (body as any).reason_text ?? null,
      status: "OPEN",
      is_urgent: (body as any).is_urgent ?? false,
      severity: (body as any).severity ?? null,
      reporter_contact_email: (body as any).reporter_contact_email ?? null,
      created_at: now,
      reviewed_at: null,
      closed_at: null,
      assigned_moderator_id: null,
      closed_by_moderator_id: null,
      resolution_notes: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    reporterUserId: created.reporter_user_id ?? null,
    communityId: created.community_id ?? null,
    postId: created.post_id ?? null,
    commentId: created.comment_id ?? null,
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
