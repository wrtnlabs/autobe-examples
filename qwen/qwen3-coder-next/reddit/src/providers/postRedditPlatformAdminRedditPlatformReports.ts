import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformReportCollector } from "../collectors/RedditPlatformReportCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAdminRedditPlatformReports(props: {
  admin: AdminPayload;
  body: IRedditPlatformReport.ICreate;
}): Promise<IRedditPlatformReport> {
  const created = await MyGlobal.prisma.reddit_platform_reports.create({
    data: await RedditPlatformReportCollector.collect({
      body: props.body,
      redditPlatformMembers: { id: props.admin.id },
      redditPlatformMemberSessions: { id: props.admin.session_id },
    }),
    ...RedditPlatformReportTransformer.select(),
  });
  return await RedditPlatformReportTransformer.transform(created);
}
