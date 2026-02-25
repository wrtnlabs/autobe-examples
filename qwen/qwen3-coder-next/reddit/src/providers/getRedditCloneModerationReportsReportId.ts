import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneModerationReportTransformer } from "../transformers/RedditCloneModerationReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModerationReportsReportId(props: {
  reportId: string;
}): Promise<IRedditCloneModerationReport> {
  const report =
    await MyGlobal.prisma.reddit_clone_moderation_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditCloneModerationReportTransformer.select(),
    });
  return await RedditCloneModerationReportTransformer.transform(report);
}
