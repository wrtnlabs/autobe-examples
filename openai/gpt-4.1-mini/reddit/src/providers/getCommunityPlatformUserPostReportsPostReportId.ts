import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserPostReportsPostReportId(props: {
  user: UserPayload;
  postReportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostReport> {
  const report =
    await MyGlobal.prisma.community_platform_post_reports.findUnique({
      where: { id: props.postReportId },
      select: {
        id: true,
        community_platform_user_id: true,
        community_platform_post_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!report) throw new HttpException("Post report not found", 404);
  const reporter = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: report.community_platform_user_id },
    select: {
      id: true,
      display_name: true,
      avatar_url: true,
      created_at: true,
    },
  });
  if (!reporter) throw new HttpException("Reporter not found", 404);
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: report.community_platform_post_id },
    select: {
      id: true,
      title: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);
  const result: ICommunityPlatformPostReport = {
    id: report.id,
    reporter_id: report.community_platform_user_id,
    post_id: report.community_platform_post_id,
    reason: report.reason,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at:
      report.deleted_at === null ? null : toISOStringSafe(report.deleted_at),
    reporter: {
      id: reporter.id,
      display_name: reporter.display_name,
      avatar_url: reporter.avatar_url === null ? null : reporter.avatar_url,
      created_at: toISOStringSafe(reporter.created_at),
    },
    post: {
      id: post.id,
      title: post.title,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
    },
  };
  return result;
}
