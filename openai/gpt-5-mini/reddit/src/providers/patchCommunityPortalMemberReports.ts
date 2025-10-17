import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import { IPageICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPortalMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPortalReport.IRequest;
}): Promise<IPageICommunityPortalReport.ISummary> {
  const { member, body } = props;

  const limit = Number(body.limit ?? 10);
  const offset = Number(body.offset ?? 0);

  const allowedStatuses = new Set([
    "OPEN",
    "IN_REVIEW",
    "REQUIRES_ACTION",
    "DISMISSED",
    "CLOSED",
  ]);

  if (
    body.status !== undefined &&
    body.status !== null &&
    !allowedStatuses.has(body.status)
  ) {
    throw new HttpException("Invalid status filter", 400);
  }

  // Members may only query their own reports
  const reporterUserId =
    (body as any).reporterUserId ?? (body as any).reporter_user_id ?? undefined;
  if (
    reporterUserId !== undefined &&
    reporterUserId !== null &&
    reporterUserId !== member.id
  ) {
    throw new HttpException(
      "Forbidden: cannot query other user's reports",
      403,
    );
  }

  // Enforce member scoping: always restrict to caller's reporter_user_id
  const whereCondition = {
    reporter_user_id: member.id,
    ...(body.communityId !== undefined &&
      body.communityId !== null && { community_id: body.communityId }),
    ...(body.postId !== undefined &&
      body.postId !== null && { post_id: body.postId }),
    ...(body.commentId !== undefined &&
      body.commentId !== null && { comment_id: body.commentId }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.isUrgent !== undefined &&
      body.isUrgent !== null && { is_urgent: body.isUrgent }),
    ...(body.severity !== undefined &&
      body.severity !== null && { severity: body.severity }),
    ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          created_at: {
            ...(body.createdFrom !== undefined &&
              body.createdFrom !== null && {
                gte: toISOStringSafe(body.createdFrom),
              }),
            ...(body.createdTo !== undefined &&
              body.createdTo !== null && {
                lte: toISOStringSafe(body.createdTo),
              }),
          },
        }
      : {}),
  };

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.community_portal_reports.findMany({
        where: whereCondition,
        orderBy:
          body.sort === "severity"
            ? { severity: "asc" }
            : { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
      MyGlobal.prisma.community_portal_reports.count({ where: whereCondition }),
    ]);

    const data = rows.map((r) => {
      return {
        id: r.id,
        reporter_user_id:
          r.reporter_user_id === null ? null : r.reporter_user_id,
        community_id: r.community_id === null ? null : r.community_id,
        post_id: r.post_id === null ? null : r.post_id,
        comment_id: r.comment_id === null ? null : r.comment_id,
        reason_code: r.reason_code,
        reason_text: r.reason_text ?? null,
        status: r.status,
        is_urgent: r.is_urgent,
        severity: r.severity ?? null,
        created_at: toISOStringSafe(r.created_at),
        reviewed_at: r.reviewed_at ? toISOStringSafe(r.reviewed_at) : null,
        closed_at: r.closed_at ? toISOStringSafe(r.closed_at) : null,
      };
    });

    const pages = limit > 0 ? Math.ceil(total / limit) : 0;
    const current = Math.max(1, Math.floor(offset / (limit || 1)) + 1);

    return {
      pagination: {
        current,
        limit,
        records: total,
        pages,
      },
      data,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
