import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberReports(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.ICreate;
}): Promise<IRedditPlatformReport> {
  const { community_id, reported_content_type, reported_content_id, reason } =
    props.body;
  // Check if user is banned from community
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
    where: {
      community_id,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Validate reported content exists
  if (reported_content_type === "POST") {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: { id: reported_content_id },
    });
    if (post === null) {
      throw new HttpException("Reported post does not exist", 404);
    }
  } else if (reported_content_type === "COMMENT") {
    const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
      where: { id: reported_content_id },
    });
    if (comment === null) {
      throw new HttpException("Reported comment does not exist", 404);
    }
  } else {
    throw new HttpException("Invalid reported content type", 400);
  }
  // Check for duplicate report
  const existingReport =
    await MyGlobal.prisma.reddit_platform_reports.findUnique({
      where: {
        reporter_id_reported_content_type_reported_content_id: {
          reporter_id: props.member.id,
          reported_content_type,
          reported_content_id,
        },
      },
    });
  if (existingReport !== null) {
    throw new HttpException("You have already reported this content", 409);
  }
  // Create the report using the collector
  const created = await MyGlobal.prisma.reddit_platform_reports.create({
    data: {
      id: v4(),
      reporter: { connect: { id: props.member.id } },
      community: { connect: { id: community_id } },
      reported_content_type,
      reported_content_id,
      reason,
      status: "PENDING",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...RedditPlatformReportTransformer.select(),
  });
  return await RedditPlatformReportTransformer.transform(created);
}
