import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function getCommunityBbsCommunityMemberReportsReportId(props: {
  communityMember: CommunitymemberPayload;
  reportId: string & tags.Format<"uuid">;
  includeAttachments: string;
}): Promise<ICommunityBbsReport> {
  const { communityMember, reportId, includeAttachments } = props;

  // Fetch report
  const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new HttpException("Not Found", 404);

  // Resolve community context for authorization
  let communityId: string | null = null;

  if (report.target_type === "post") {
    const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
      where: { id: report.target_id },
      select: { community_bbs_community_id: true },
    });
    if (!post) {
      // Log attempt before throwing
      await MyGlobal.prisma.community_bbs_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_type: "community_member",
          actor_id: communityMember.id,
          entity: "report",
          action: "read_attempt",
          payload: JSON.stringify({ reportId, reason: "post_not_found" }),
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      throw new HttpException("Not Found", 404);
    }
    communityId = post.community_bbs_community_id;
  } else if (report.target_type === "comment") {
    const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
      where: { id: report.target_id },
      select: { community_bbs_community_id: true },
    });
    if (!comment) {
      await MyGlobal.prisma.community_bbs_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_type: "community_member",
          actor_id: communityMember.id,
          entity: "report",
          action: "read_attempt",
          payload: JSON.stringify({ reportId, reason: "comment_not_found" }),
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      throw new HttpException("Not Found", 404);
    }
    communityId = comment.community_bbs_community_id;
  } else if (report.target_type === "community") {
    communityId = report.target_id;
  } else {
    // target_type === 'user' or unknown - no community context
    communityId = null;
  }

  // Authorization: only community moderators for the resolved community or system admins
  let authorized = false;

  if (communityId) {
    const moderator =
      await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
        where: {
          community_id: communityId,
          community_member_id: communityMember.id,
          active: true,
        },
      });
    if (moderator) authorized = true;
  } else {
    // No community context (user-targeted reports) - only system admins allowed
    // We don't have a system admin payload in props; deny access
    authorized = false;
  }

  // Log access attempt
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "report",
      action: "read",
      payload: JSON.stringify({
        reportId,
        includeAttachments: includeAttachments === "true",
        authorized,
      }),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  if (!authorized)
    throw new HttpException(
      "Unauthorized: Only community moderators or system administrators can view this report",
      403,
    );

  // Optionally fetch attachments for auditing/payload (do not add to response DTO)
  if (includeAttachments === "true") {
    await MyGlobal.prisma.community_bbs_report_attachments.findMany({
      where: { community_bbs_report_id: reportId },
      select: {
        id: true,
        href: true,
        mime_type: true,
        size_bytes: true,
        created_at: true,
      },
    });
    // attachments intentionally not returned due to DTO constraints
  }

  // Map Prisma record to API DTO with correct null/undefined handling and date conversions
  return {
    id: report.id as string & tags.Format<"uuid">,
    reporter_id:
      report.reporter_id === null
        ? null
        : (report.reporter_id as string & tags.Format<"uuid">),
    target_type: report.target_type as
      | "post"
      | "comment"
      | "community"
      | "user",
    target_id: report.target_id as string & tags.Format<"uuid">,
    reason_code: report.reason_code as
      | "spam"
      | "harassment"
      | "copyright"
      | "illegal"
      | "other",
    explanation: report.explanation ?? null,
    evidence_count: report.evidence_count,
    priority: report.priority as "low" | "medium" | "high" | "critical",
    status: report.status as "open" | "in_review" | "resolved" | "dismissed",
    handled_by_actor_type:
      report.handled_by_actor_type === null ||
      report.handled_by_actor_type === undefined
        ? null
        : typia.assert<"community_moderator" | "system_admin" | "automation">(
            report.handled_by_actor_type,
          ),
    handled_by_actor_id: report.handled_by_actor_id ?? null,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    resolved_at: report.resolved_at
      ? toISOStringSafe(report.resolved_at)
      : null,
  };
}
