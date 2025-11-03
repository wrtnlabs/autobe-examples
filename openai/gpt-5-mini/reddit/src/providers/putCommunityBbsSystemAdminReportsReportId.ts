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
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function putCommunityBbsSystemAdminReportsReportId(props: {
  systemAdmin: SystemadminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityBbsReport.IUpdate;
}): Promise<ICommunityBbsReport> {
  const { systemAdmin, reportId, body } = props;

  // Fetch existing report
  const existing = await MyGlobal.prisma.community_bbs_reports.findUnique({
    where: { id: reportId },
  });
  if (!existing) throw new HttpException("Not Found", 404);

  // Optimistic concurrency check
  if (body.updated_at !== undefined && body.updated_at !== null) {
    const dbUpdatedAt = toISOStringSafe(existing.updated_at);
    if (body.updated_at !== dbUpdatedAt) {
      throw new HttpException("Conflict: concurrent update", 409);
    }
  }

  // Validate handled_by_actor mapping
  if (
    body.handled_by_actor_id !== undefined &&
    body.handled_by_actor_id !== null &&
    (body.handled_by_actor_type === undefined ||
      body.handled_by_actor_type === null)
  ) {
    throw new HttpException(
      "Bad Request: handled_by_actor_type is required when handled_by_actor_id is provided",
      400,
    );
  }

  if (
    body.handled_by_actor_type !== undefined &&
    body.handled_by_actor_type !== null
  ) {
    if (body.handled_by_actor_type === "system_admin") {
      if (
        body.handled_by_actor_id === null ||
        body.handled_by_actor_id === undefined
      ) {
        throw new HttpException(
          "Bad Request: handled_by_actor_id required for system_admin",
          400,
        );
      }
      const admin = await MyGlobal.prisma.community_bbs_systemadmin.findFirst({
        where: { id: body.handled_by_actor_id, deleted_at: null },
      });
      if (!admin)
        throw new HttpException(
          "Bad Request: handled_by_actor_id not found for system_admin",
          400,
        );
    } else if (body.handled_by_actor_type === "community_moderator") {
      if (
        body.handled_by_actor_id === null ||
        body.handled_by_actor_id === undefined
      ) {
        throw new HttpException(
          "Bad Request: handled_by_actor_id required for community_moderator",
          400,
        );
      }
      const moderator =
        await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
          where: { id: body.handled_by_actor_id },
        });
      if (!moderator)
        throw new HttpException(
          "Bad Request: handled_by_actor_id not found for community_moderator",
          400,
        );
    } else if (body.handled_by_actor_type === "automation") {
      // no DB validation required for automation
    } else {
      throw new HttpException(
        "Bad Request: invalid handled_by_actor_type",
        400,
      );
    }
  }

  // Prepare server-controlled resolved_at when status -> resolved and no value provided
  const now = toISOStringSafe(new Date());
  const shouldSetResolvedAt =
    body.status === "resolved" && body.resolved_at === undefined;

  // Perform update
  const updated = await MyGlobal.prisma.community_bbs_reports.update({
    where: { id: reportId },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.handled_by_actor_type !== undefined && {
        handled_by_actor_type: body.handled_by_actor_type,
      }),
      ...(body.handled_by_actor_id !== undefined && {
        handled_by_actor_id: body.handled_by_actor_id,
      }),
      ...(body.resolved_at !== undefined
        ? {
            resolved_at:
              body.resolved_at === null
                ? null
                : toISOStringSafe(body.resolved_at),
          }
        : {}),
      ...(shouldSetResolvedAt && { resolved_at: now }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Audit log
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "system_admin",
      actor_id: systemAdmin.id,
      entity: "report",
      action: "update",
      payload: JSON.stringify({ reportId, changes: body }),
      created_at: now,
      updated_at: now,
    },
  });

  // Create moderation action when applicable: only when actor is community_moderator
  if (
    (body.status === "resolved" || body.status === "dismissed") &&
    body.handled_by_actor_type === "community_moderator" &&
    body.handled_by_actor_id
  ) {
    await MyGlobal.prisma.community_bbs_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: body.handled_by_actor_id,
        target_post_id:
          existing.target_type === "post" ? existing.target_id : null,
        target_comment_id:
          existing.target_type === "comment" ? existing.target_id : null,
        target_community_id:
          existing.target_type === "community" ? existing.target_id : null,
        origin_report_id: existing.id,
        action_type: body.status === "resolved" ? "remove" : "restore",
        reason_code: existing.reason_code,
        note: null,
        expires_at: null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  // Return mapped response converting dates
  return {
    id: updated.id,
    reporter_id: updated.reporter_id ?? null,
    target_type: updated.target_type as
      | "post"
      | "comment"
      | "community"
      | "user",
    target_id: updated.target_id,
    target: undefined,
    reason_code: updated.reason_code as
      | "spam"
      | "harassment"
      | "copyright"
      | "illegal"
      | "other",
    explanation: updated.explanation ?? null,
    evidence_count: updated.evidence_count,
    priority: typia.assert<"low" | "medium" | "high" | "critical">(
      updated.priority,
    ),
    status: typia.assert<"open" | "in_review" | "resolved" | "dismissed">(
      updated.status,
    ),
    handled_by_actor_type: updated.handled_by_actor_type as
      | "community_moderator"
      | "system_admin"
      | "automation"
      | null
      | undefined,
    handled_by_actor_id: updated.handled_by_actor_id ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
  };
}
