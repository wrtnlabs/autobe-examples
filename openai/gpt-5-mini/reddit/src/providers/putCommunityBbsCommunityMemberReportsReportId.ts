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

export async function putCommunityBbsCommunityMemberReportsReportId(props: {
  communityMember: CommunitymemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityBbsReport.IUpdate;
}): Promise<ICommunityBbsReport> {
  const { communityMember, reportId, body } = props;

  // Fetch the existing report
  const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new HttpException("Not Found", 404);

  // Resolve community context based on reported target
  let communityId: string | null = null;
  if (report.target_type === "post") {
    const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
      where: { id: report.target_id },
      select: { community_bbs_community_id: true },
    });
    if (!post) throw new HttpException("Target post not found", 404);
    communityId = post.community_bbs_community_id;
  } else if (report.target_type === "comment") {
    const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
      where: { id: report.target_id },
      select: { community_bbs_community_id: true },
    });
    if (!comment) throw new HttpException("Target comment not found", 404);
    communityId = comment.community_bbs_community_id;
  } else if (report.target_type === "community") {
    communityId = report.target_id;
  } else if (report.target_type === "user") {
    // User-targeted reports require system-admin handling; community moderators cannot act
    throw new HttpException("Unauthorized", 403);
  }

  // Authorization: caller must be a moderator of the target community
  const moderator =
    await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
      where: {
        // convert possible null to undefined so Prisma optional filter type matches
        community_id: communityId ?? undefined,
        community_member_id: communityMember.id,
        active: true,
      },
    });
  if (!moderator)
    throw new HttpException("Unauthorized: moderator required", 403);

  // Optimistic concurrency check
  if (body.updated_at !== undefined && body.updated_at !== null) {
    const persistedUpdatedAt = report.updated_at
      ? toISOStringSafe(report.updated_at)
      : null;
    if (persistedUpdatedAt !== body.updated_at)
      throw new HttpException("Conflict", 409);
  }

  // Validate handled_by_actor semantics
  if (
    body.handled_by_actor_id !== undefined &&
    (body.handled_by_actor_type === undefined ||
      body.handled_by_actor_type === null)
  ) {
    throw new HttpException(
      "Bad Request: handled_by_actor_type required when handled_by_actor_id is provided",
      400,
    );
  }

  if (
    body.handled_by_actor_type !== undefined &&
    body.handled_by_actor_type !== null
  ) {
    if (body.handled_by_actor_type === "community_moderator") {
      if (
        body.handled_by_actor_id !== undefined &&
        body.handled_by_actor_id !== null
      ) {
        const targetModerator =
          await MyGlobal.prisma.community_bbs_community_moderators.findUnique({
            where: { id: body.handled_by_actor_id },
          });
        if (!targetModerator)
          throw new HttpException(
            "Bad Request: handled_by_actor_id not a moderator",
            400,
          );
        if (targetModerator.community_id !== communityId)
          throw new HttpException(
            "Bad Request: moderator not in target community",
            400,
          );
      }
    } else if (body.handled_by_actor_type === "system_admin") {
      if (
        body.handled_by_actor_id !== undefined &&
        body.handled_by_actor_id !== null
      ) {
        const admin =
          await MyGlobal.prisma.community_bbs_systemadmin.findUnique({
            where: { id: body.handled_by_actor_id },
          });
        if (!admin)
          throw new HttpException(
            "Bad Request: handled_by_actor_id not a system admin",
            400,
          );
      }
    } else if (body.handled_by_actor_type === "automation") {
      if (
        body.handled_by_actor_id !== undefined &&
        body.handled_by_actor_id !== null
      ) {
        throw new HttpException(
          "Bad Request: automation handler must not have an actor id",
          400,
        );
      }
    } else {
      throw new HttpException(
        "Bad Request: invalid handled_by_actor_type",
        400,
      );
    }
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

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
        handled_by_actor_id:
          body.handled_by_actor_id === null ? null : body.handled_by_actor_id,
      }),
      ...(body.resolved_at !== undefined
        ? {
            resolved_at:
              body.resolved_at === null
                ? null
                : toISOStringSafe(body.resolved_at),
          }
        : body.status === "resolved"
          ? { resolved_at: now }
          : {}),
      updated_at: now,
    },
  });

  // Create audit log
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "report",
      action: "updated",
      payload: JSON.stringify({
        before: report,
        after: updated,
        changes: body,
      }),
      ip: null,
      created_at: now,
      updated_at: now,
    },
  });

  // Create moderation action for significant lifecycle changes
  if (
    body.status === "resolved" ||
    body.status === "dismissed" ||
    body.status === "in_review"
  ) {
    await MyGlobal.prisma.community_bbs_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: moderator.id,
        target_post_id: null,
        target_comment_id: null,
        target_community_id: communityId,
        origin_report_id: reportId,
        action_type: `report_${body.status}`,
        reason_code: null,
        // ICommunityBbsReport.IUpdate does not declare `explanation`, avoid accessing non-existent property
        note: null,
        expires_at: null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  // Validate and coerce primitive handled_by_actor_type to expected union (primitive-level assertion)
  const handledByActorType = typia.assert<
    "community_moderator" | "system_admin" | "automation" | null
  >(updated.handled_by_actor_type ?? null);

  // Return API DTO with proper date string conversions and null/undefined handling
  return {
    id: updated.id as string & tags.Format<"uuid">,
    reporter_id: updated.reporter_id ?? undefined,
    target_type: updated.target_type as
      | "post"
      | "comment"
      | "community"
      | "user",
    target_id: updated.target_id as string & tags.Format<"uuid">,
    target: undefined,
    reason_code: updated.reason_code as
      | "spam"
      | "harassment"
      | "copyright"
      | "illegal"
      | "other",
    explanation: updated.explanation ?? null,
    evidence_count: updated.evidence_count as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    priority: updated.priority as "low" | "medium" | "high" | "critical",
    status: updated.status as "open" | "in_review" | "resolved" | "dismissed",
    handled_by_actor_type: handledByActorType,
    handled_by_actor_id: updated.handled_by_actor_id ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
  };
}
