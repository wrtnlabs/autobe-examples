import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentReportCollector } from "../collectors/CommunityPlatformCommentReportCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentReportTransformer } from "../transformers/CommunityPlatformCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserCommentReports(props: {
  user: UserPayload;
  body: ICommunityPlatformCommentReport.ICreate;
}): Promise<ICommunityPlatformCommentReport> {
  const userId = props.user.id;
  // Prevent duplicate reports by the same user on the same comment
  const existingReport =
    await MyGlobal.prisma.community_platform_comment_reports.findFirst({
      where: {
        comment_id: props.body.comment_id,
        reporter_user_id: userId,
        deleted_at: null,
      },
    });
  if (existingReport) {
    throw new HttpException("Duplicate report detected", 400);
  }
  // Use collector to prepare create data
  const collected = await CommunityPlatformCommentReportCollector.collect({
    body: props.body,
    reporterUser: { id: userId },
  });
  // Create the report in a transaction
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.community_platform_comment_reports.create({
      data: collected,
    });
  });
  // Fetch the created report with relevant relations
  const reportRecord =
    await MyGlobal.prisma.community_platform_comment_reports.findUniqueOrThrow({
      where: { id: created.id },
      ...CommunityPlatformCommentReportTransformer.select(),
    });
  // Transform DB record to DTO
  const dto =
    await CommunityPlatformCommentReportTransformer.transform(reportRecord);
  return dto;
}
