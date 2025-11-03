import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postRedditCommunityUserContentReports(props: {
  user: UserPayload;
  body: IRedditCommunityContentReport.ICreate;
}): Promise<IRedditCommunityContentReport> {
  const { user, body } = props;

  if (body.content_type === "post") {
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: body.content_id },
    });
  } else {
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: body.content_id },
    });
  }

  await MyGlobal.prisma.reddit_community_report_reasons.findUniqueOrThrow({
    where: { id: body.report_reason_id },
  });

  const pendingStatus =
    await MyGlobal.prisma.reddit_community_report_statuses.findUniqueOrThrow({
      where: { status_code: "pending" },
    });

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_content_reports.create(
    {
      data: {
        id: v4(),
        reporter_id: user.id,
        content_id: body.content_id,
        report_reason_id: body.report_reason_id,
        report_status_id: pendingStatus.id,
        content_type: body.content_type,
        additional_details: body.additional_details ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    reporter_id: created.reporter_id,
    content_id: created.content_id,
    report_reason_id: created.report_reason_id,
    report_status_id: created.report_status_id,
    content_type: created.content_type as "post" | "comment",
    additional_details: created.additional_details ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
