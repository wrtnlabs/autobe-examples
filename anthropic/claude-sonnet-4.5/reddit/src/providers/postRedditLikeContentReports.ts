import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";

export async function postRedditLikeContentReports(props: {
  body: IRedditLikeContentReport.ICreate;
}): Promise<IRedditLikeContentReport> {
  const { body } = props;

  // Validate exactly one content type is specified using direct checks
  if (body.reported_post_id !== undefined && body.reported_post_id !== null) {
    if (
      body.reported_comment_id !== undefined &&
      body.reported_comment_id !== null
    ) {
      throw new HttpException(
        "Only one of reported_post_id or reported_comment_id can be provided, not both",
        400,
      );
    }
    if (body.content_type !== "post") {
      throw new HttpException(
        "content_type must be 'post' when reported_post_id is provided",
        400,
      );
    }
  } else if (
    body.reported_comment_id !== undefined &&
    body.reported_comment_id !== null
  ) {
    if (body.content_type !== "comment") {
      throw new HttpException(
        "content_type must be 'comment' when reported_comment_id is provided",
        400,
      );
    }
  } else {
    throw new HttpException(
      "Either reported_post_id or reported_comment_id must be provided",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_like_content_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reporter_member_id: null,
      reported_post_id: body.reported_post_id ?? null,
      reported_comment_id: body.reported_comment_id ?? null,
      community_id: body.community_id,
      content_type: body.content_type,
      violation_categories: body.violation_categories,
      additional_context: body.additional_context ?? null,
      status: "pending",
      reporter_ip_address: null,
      is_anonymous_report: true,
      is_high_priority: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    content_type: created.content_type,
    violation_categories: created.violation_categories,
    additional_context: created.additional_context ?? undefined,
    status: created.status,
    is_anonymous_report: created.is_anonymous_report,
    is_high_priority: created.is_high_priority,
    created_at: now,
  };
}
