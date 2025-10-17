import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

export async function postRedditCommunityReports(props: {
  body: IRedditCommunityReport.ICreate;
}): Promise<IRedditCommunityReport> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reporter_guest_id: props.body.reporter_guest_id ?? undefined,
      reporter_member_id: props.body.reporter_member_id ?? undefined,
      reported_post_id: props.body.reported_post_id ?? undefined,
      reported_comment_id: props.body.reported_comment_id ?? undefined,
      reported_member_id: props.body.reported_member_id ?? undefined,
      status_id: props.body.status_id,
      category: props.body.category,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    reporter_guest_id: created.reporter_guest_id ?? null,
    reporter_member_id: created.reporter_member_id ?? null,
    reported_post_id: created.reported_post_id ?? null,
    reported_comment_id: created.reported_comment_id ?? null,
    reported_member_id: created.reported_member_id ?? null,
    status_id: created.status_id,
    category: created.category,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
