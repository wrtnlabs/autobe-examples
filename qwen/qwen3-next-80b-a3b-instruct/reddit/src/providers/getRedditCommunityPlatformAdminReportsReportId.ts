import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostCommentCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostCommentCount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityPostCommentCountTransformer } from "../transformers/RedditCommunityPostCommentCountTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityPlatformAdminReportsReportId(props: {
  platformAdmin: PlatformadminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostCommentCount> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUnique({
      where: { id: props.reportId },
      ...RedditCommunityPostCommentCountTransformer.select(),
    });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  return await RedditCommunityPostCommentCountTransformer.transform(report);
}
