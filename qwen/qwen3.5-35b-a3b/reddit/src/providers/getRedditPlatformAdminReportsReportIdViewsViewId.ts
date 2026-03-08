import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportViewTransformer } from "../transformers/RedditPlatformReportViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminReportsReportIdViewsViewId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  viewId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReportView> {
  // Fetch the report to determine its community
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: { community_id: true },
    });
  // Verify the admin has moderation privileges for this community
  const moderation =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id,
        user_id: props.admin.id,
      },
    });
  if (moderation === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the report view record with full details
  const view =
    await MyGlobal.prisma.reddit_platform_report_views.findUniqueOrThrow({
      where: { id: props.viewId },
      ...RedditPlatformReportViewTransformer.select(),
    });
  return await RedditPlatformReportViewTransformer.transform(view);
}
