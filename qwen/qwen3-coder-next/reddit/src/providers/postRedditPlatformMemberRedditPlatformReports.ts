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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberRedditPlatformReports(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.ICreate;
}): Promise<IRedditPlatformReport> {
  // Validate that reporter is not reporting their own content
  const reporter = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: props.member.id },
  });
  if (!reporter) {
    throw new HttpException("Reporter not found", 404);
  }
  // Check for duplicate report on the same content by the same reporter
  const existingReport =
    await MyGlobal.prisma.reddit_platform_reports.findFirst({
      where: {
        reporter_id: props.member.id,
        reported_type: props.body.reported_type,
        reported_id: props.body.reported_id,
      },
    });
  if (existingReport) {
    throw new HttpException("Duplicate report for same content", 409);
  }
  // Create the report using the collector
  const created = await MyGlobal.prisma.reddit_platform_reports.create({
    data: await RedditPlatformReportCollector.collect({
      body: props.body,
      redditPlatformMembers: { id: props.member.id },
      redditPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...RedditPlatformReportTransformer.select(),
  });
  return await RedditPlatformReportTransformer.transform(created);
}
