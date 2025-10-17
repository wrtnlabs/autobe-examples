import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";

export async function postEconPoliticalForumReports(props: {
  body: IEconPoliticalForumReport.ICreate;
}): Promise<IEconPoliticalForumReport> {
  const { body } = props;

  // Allowed reason codes
  const allowedReasons = [
    "harassment",
    "doxxing",
    "misinformation",
    "illegal_content",
    "spam",
    "other",
  ];

  // Validate presence of target
  if (
    (body.reported_post_id === undefined || body.reported_post_id === null) &&
    (body.reported_thread_id === undefined || body.reported_thread_id === null)
  ) {
    throw new HttpException(
      "At least one of reported_post_id or reported_thread_id must be provided",
      400,
    );
  }

  // Validate reason_code
  if (!body.reason_code || !allowedReasons.includes(body.reason_code)) {
    throw new HttpException("Invalid reason_code", 400);
  }

  // Validate reporter_text length
  if (body.reporter_text !== undefined && body.reporter_text !== null) {
    if ((body.reporter_text as string).length > 2000) {
      throw new HttpException(
        "reporter_text must not exceed 2000 characters",
        400,
      );
    }
  }

  // Sanitize reporter_text
  const sanitizeReporterText = (input?: string | null) => {
    if (input === undefined || input === null) return null;
    // Remove script tags and strip HTML tags
    let s = input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<[^>]*>/g, "");
    // Trim to max length
    if (s.length > 2000) s = s.slice(0, 2000);
    return s;
  };

  const sanitizedText = sanitizeReporterText(body.reporter_text);

  // Check target existence
  if (body.reported_post_id !== undefined && body.reported_post_id !== null) {
    const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
      where: { id: body.reported_post_id },
      select: { id: true },
    });
    if (!post) throw new HttpException("Reported post not found", 404);
  }

  if (
    body.reported_thread_id !== undefined &&
    body.reported_thread_id !== null
  ) {
    const thread =
      await MyGlobal.prisma.econ_political_forum_threads.findUnique({
        where: { id: body.reported_thread_id },
        select: { id: true },
      });
    if (!thread) throw new HttpException("Reported thread not found", 404);
  }

  // Simple anti-abuse: limit number of reports for same target
  const abuseCount = await MyGlobal.prisma.econ_political_forum_reports.count({
    where: {
      ...(body.reported_post_id !== undefined &&
        body.reported_post_id !== null && {
          reported_post_id: body.reported_post_id,
        }),
      ...(body.reported_thread_id !== undefined &&
        body.reported_thread_id !== null && {
          reported_thread_id: body.reported_thread_id,
        }),
    },
  });
  if (abuseCount > 20) {
    throw new HttpException(
      "Too many reports for this target; try again later",
      429,
    );
  }

  // Prepare creation values
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.econ_political_forum_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reporter_id: null,
      reported_post_id: body.reported_post_id ?? null,
      reported_thread_id: body.reported_thread_id ?? null,
      moderator_id: null,
      moderation_case_id: null,
      reason_code: body.reason_code,
      reporter_text: sanitizedText,
      reporter_anonymous: body.reporter_anonymous ?? false,
      status: "pending",
      priority: body.priority ?? "normal",
      created_at: now,
      triaged_at: null,
      reviewed_at: null,
      resolved_at: null,
      deleted_at: null,
    },
  });

  // Build response, redacting reporter identity for public callers or anonymous reports
  const response: IEconPoliticalForumReport = {
    id: created.id as string & tags.Format<"uuid">,
    reporter_id: null,
    reported_post_id: created.reported_post_id ?? undefined,
    reported_thread_id: created.reported_thread_id ?? undefined,
    moderator_id: null,
    moderation_case_id: null,
    reason_code: created.reason_code,
    reporter_text: created.reporter_text ?? null,
    reporter_anonymous: created.reporter_anonymous,
    status: created.status,
    priority: created.priority,
    created_at: toISOStringSafe(created.created_at),
    triaged_at: created.triaged_at ? toISOStringSafe(created.triaged_at) : null,
    reviewed_at: created.reviewed_at
      ? toISOStringSafe(created.reviewed_at)
      : null,
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : null,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };

  return response;
}
