import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportCollector } from "../collectors/CommunityPlatformReportCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserReports(props: {
  user: UserPayload;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  const { user, body } = props;
  // Validate essential input fields
  if (!body.contentDiscriminator || !body.contentId) {
    throw new HttpException("Content type and ID must be provided", 400);
  }
  if (!body.reportReasonId) {
    throw new HttpException("Report reason ID must be provided", 400);
  }
  if (!body.description || body.description.trim().length === 0) {
    throw new HttpException("Description must be provided", 400);
  }
  // Validate content discriminator
  if (
    body.contentDiscriminator !== "post" &&
    body.contentDiscriminator !== "comment"
  ) {
    throw new HttpException(
      "Content discriminator must be either post or comment",
      400,
    );
  }
  // Validate existence of reported content
  if (body.contentDiscriminator === "post") {
    const postExists =
      await MyGlobal.prisma.community_platform_posts.findUnique({
        where: { id: body.contentId },
        select: { id: true },
      });
    if (!postExists) {
      throw new HttpException("Reported post not found", 404);
    }
  } else {
    const commentExists =
      await MyGlobal.prisma.community_platform_post_comments.findUnique({
        where: { id: body.contentId },
        select: { id: true },
      });
    if (!commentExists) {
      throw new HttpException("Reported comment not found", 404);
    }
  }
  // Verify report reason existence
  const reportReason =
    await MyGlobal.prisma.community_platform_report_reasons.findUnique({
      where: { id: body.reportReasonId },
    });
  if (!reportReason) {
    throw new HttpException("Report reason not found", 404);
  }
  // Prepare collected data for report creation
  const collectedData = await CommunityPlatformReportCollector.collect({
    body: { description: body.description, status: "pending" },
    user: { id: user.id },
    reportReason: { id: reportReason.id },
  });
  // Create the report in database
  const createdReport = await MyGlobal.prisma.community_platform_reports.create(
    {
      data: collectedData,
      ...CommunityPlatformReportTransformer.select(),
    },
  );
  // Prepare timestamps as ISO strings
  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;
  // Create reported content entry
  if (body.contentDiscriminator === "post") {
    await MyGlobal.prisma.community_platform_reported_contents.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_report_id: createdReport.id,
        community_platform_reported_post_id: body.contentId,
        community_platform_reported_comment_id: null,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });
  } else {
    await MyGlobal.prisma.community_platform_reported_contents.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_report_id: createdReport.id,
        community_platform_reported_post_id: null,
        community_platform_reported_comment_id: body.contentId,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });
  }
  // Get the full report record and transform
  const fullReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: createdReport.id },
      ...CommunityPlatformReportTransformer.select(),
    });
  return await CommunityPlatformReportTransformer.transform(fullReport);
}
