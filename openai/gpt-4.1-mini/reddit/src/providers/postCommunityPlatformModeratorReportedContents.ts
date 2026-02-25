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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorReportedContents(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  if (
    (props.body.postId === undefined && props.body.commentId === undefined) ||
    (props.body.postId !== undefined && props.body.commentId !== undefined)
  ) {
    throw new HttpException(
      "You must specify exactly one target content: postId or commentId",
      400,
    );
  }
  if (
    typeof props.body.communityPlatformReportReasonId !== "string" ||
    props.body.communityPlatformReportReasonId.trim() === ""
  ) {
    throw new HttpException("Report reason ID must be specified", 400);
  }
  const reportReason =
    await MyGlobal.prisma.community_platform_report_reasons.findUniqueOrThrow({
      where: { id: props.body.communityPlatformReportReasonId },
    });
  // Prepare user entity with only id to satisfy collector input
  const user = { id: props.moderator.id };
  // Collect create input for the report
  const reportCreateInput = await CommunityPlatformReportCollector.collect({
    body: props.body,
    user,
    reportReason,
  });
  // Create the report record
  const createdReport = await MyGlobal.prisma.community_platform_reports.create(
    {
      data: reportCreateInput,
      ...CommunityPlatformReportTransformer.select(),
    },
  );
  // Insert link to reportedContents manually since collector returns undefined
  await MyGlobal.prisma.community_platform_reported_contents.create({
    data: {
      id: v4(),
      community_platform_report_id: createdReport.id,
      community_platform_reported_post_id: props.body.postId ?? null,
      community_platform_reported_comment_id: props.body.commentId ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  // Reload the report with relations for transformer
  const fullReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: createdReport.id },
      ...CommunityPlatformReportTransformer.select(),
    });
  // Transform and return the full report
  return await CommunityPlatformReportTransformer.transform(fullReport);
}
