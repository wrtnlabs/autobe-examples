import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import { IPageICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformEscalationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorEscalationLogs(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformEscalationLog.IRequest;
}): Promise<IPageICommunityPlatformEscalationLog.ISummary> {
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        deleted_at: null,
        status: "active",
      },
      select: { id: true, community_id: true },
    });
  if (!moderatorRecord) {
    throw new HttpException("Unauthorized: Moderator record not found.", 403);
  }
  const moderatorCommunityId = moderatorRecord.community_id;

  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build escalationWhere only with undefined, never null
  const escalationWhere: any = {};
  if (body.initiator_id !== undefined)
    escalationWhere.initiator_id = body.initiator_id satisfies string as string;
  if (
    body.destination_admin_id !== undefined &&
    body.destination_admin_id !== null
  )
    escalationWhere.destination_admin_id =
      body.destination_admin_id satisfies string as string;
  if (body.report_id !== undefined && body.report_id !== null)
    escalationWhere.report_id = body.report_id satisfies string as string;
  if (body.status !== undefined)
    escalationWhere.status = body.status satisfies string as string;

  if (body.date_from || body.date_to) {
    escalationWhere.created_at = {};
    if (body.date_from)
      escalationWhere.created_at.gte =
        body.date_from satisfies string as string;
    if (body.date_to)
      escalationWhere.created_at.lte = body.date_to satisfies string as string;
  }

  const allowedSortFields = [
    "created_at",
    "updated_at",
    "status",
    "event_time",
  ];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const escalationsAll =
    await MyGlobal.prisma.community_platform_escalation_logs.findMany({
      where: escalationWhere,
      orderBy: { [sortBy as string]: sortOrder },
    });

  const reportIds = [...new Set(escalationsAll.map((e) => e.report_id))];
  if (!reportIds.length) {
    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  const reports = await MyGlobal.prisma.community_platform_reports.findMany({
    where: { id: { in: reportIds } },
    select: {
      id: true,
      post_id: true,
      comment_id: true,
    },
  });

  const reportMap = new Map<
    string,
    { post_id: string | null; comment_id: string | null }
  >();
  reports.forEach((r) => {
    reportMap.set(r.id, { post_id: r.post_id, comment_id: r.comment_id });
  });

  const postIds = reports
    .map((r) => r.post_id)
    .filter((id) => !!id) as string[];
  const commentIds = reports
    .map((r) => r.comment_id)
    .filter((id) => !!id) as string[];

  const posts =
    postIds.length > 0
      ? await MyGlobal.prisma.community_platform_posts.findMany({
          where: { id: { in: postIds } },
          select: { id: true, community_platform_community_id: true },
        })
      : [];
  const postIdToCommunity = new Map<string, string>();
  posts.forEach((p) =>
    postIdToCommunity.set(p.id, p.community_platform_community_id),
  );

  const comments =
    commentIds.length > 0
      ? await MyGlobal.prisma.community_platform_comments.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, community_platform_post_id: true },
        })
      : [];
  const commentIdToPostId = new Map<string, string>();
  comments.forEach((c) =>
    commentIdToPostId.set(c.id, c.community_platform_post_id),
  );

  const reportIdToCommunityId = new Map<string, string>();
  for (const r of reports) {
    if (r.post_id) {
      const communityId = postIdToCommunity.get(r.post_id);
      if (communityId) {
        reportIdToCommunityId.set(r.id, communityId);
      }
    } else if (r.comment_id) {
      const postId = commentIdToPostId.get(r.comment_id);
      const communityId = postId ? postIdToCommunity.get(postId) : undefined;
      if (communityId) {
        reportIdToCommunityId.set(r.id, communityId);
      }
    }
  }

  const escalationsForModerator = escalationsAll.filter((log) => {
    const reportCommunityId = reportIdToCommunityId.get(
      log.report_id satisfies string as string,
    );
    return (
      reportCommunityId !== undefined &&
      reportCommunityId === moderatorCommunityId
    );
  });

  const totalRecords = escalationsForModerator.length;
  const pages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);
  const pagedData = escalationsForModerator.slice(skip, skip + limit);

  const data = pagedData.map((log) => ({
    id: log.id,
    initiator_id: log.initiator_id satisfies string as string,
    destination_admin_id: log.destination_admin_id ?? undefined,
    report_id: log.report_id satisfies string as string,
    escalation_reason: log.escalation_reason,
    status: log.status satisfies string as string,
    created_at: toISOStringSafe(log.created_at),
    updated_at: log.updated_at ? toISOStringSafe(log.updated_at) : undefined,
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalRecords,
      pages,
    },
    data,
  };
}
