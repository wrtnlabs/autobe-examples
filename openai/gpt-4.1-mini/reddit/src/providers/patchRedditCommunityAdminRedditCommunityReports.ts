import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityReports(props: {
  admin: AdminPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> = (props.body.page >
  0
    ? props.body.page
    : 1) satisfies number as number;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> = (props.body
    .limit > 0
    ? props.body.limit
    : 10) satisfies number as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(props.body.status !== undefined
      ? { report_status: props.body.status }
      : {}),
    ...(props.body.reporter_id !== undefined
      ? { reporter_id: props.body.reporter_id }
      : {}),
    ...(props.body.target_type !== undefined
      ? { target_type: props.body.target_type }
      : {}),
    ...(props.body.target_id !== undefined
      ? { target_id: props.body.target_id }
      : {}),
  };

  const orderBy =
    props.body.sort_by !== undefined && props.body.order !== undefined
      ? { [props.body.sort_by]: props.body.order }
      : { created_at: "desc" as const };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_reports.count({ where }),
  ]);

  return {
    data: records.map((record) => ({
      report_id: record.id,
      community_id: "",
      content_id: (record.reddit_community_posts_id ??
        record.reddit_community_comments_id ??
        "") satisfies string as string,
      reporter_id: record.reddit_community_registered_user_id,
      report_reason: record.reason,
      report_status: record.status,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
