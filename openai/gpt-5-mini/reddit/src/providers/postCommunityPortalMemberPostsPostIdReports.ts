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

export async function postCommunityPortalMemberPostsPostIdReports(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPortalReport.ICreate;
}): Promise<ICommunityPortalReport> {
  const { member, postId, body } = props;

  const post = await MyGlobal.prisma.community_portal_posts.findUnique({
    where: { id: postId },
    include: { community: true },
  });

  if (!post) throw new HttpException("Post not found", 404);

  const community = post.community;

  if (community && community.is_private) {
    const [subscription, moderator] = await Promise.all([
      MyGlobal.prisma.community_portal_subscriptions.findFirst({
        where: {
          community_id: community.id,
          user_id: member.id,
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.community_portal_moderators.findFirst({
        where: {
          community_id: community.id,
          user_id: member.id,
          is_active: true,
        },
      }),
    ]);

    if (
      !subscription &&
      !moderator &&
      community.creator_user_id !== member.id
    ) {
      throw new HttpException("Unauthorized: You cannot report this post", 403);
    }
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.community_portal_reports.create({
    data: {
      id,
      reporter_user_id: member.id,
      community_id: post.community_id ?? null,
      post_id: postId,
      comment_id: null,
      assigned_moderator_id: null,
      closed_by_moderator_id: null,
      reason_code: (body as any).reasonCode,
      reason_text: (body as any).reasonText ?? null,
      status: "OPEN",
      is_urgent: (body as any).isUrgent ?? false,
      severity: (body as any).severity ?? null,
      reporter_contact_email: (body as any).reporterContactEmail ?? null,
      created_at: now,
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
    createdAt: created.created_at ? toISOStringSafe(created.created_at) : now,
    reviewedAt: created.reviewed_at
      ? toISOStringSafe(created.reviewed_at)
      : null,
    closedAt: created.closed_at ? toISOStringSafe(created.closed_at) : null,
    resolutionNotes: created.resolution_notes ?? null,
  };
}
