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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminReportedContents(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  const { admin, body } = props;
  // Validate description
  if (typeof body.description !== "string" || body.description.trim() === "") {
    throw new HttpException(
      "Description is required and must be a non-empty string",
      400,
    );
  }
  // Validate status is 'pending' for new reports
  if (body.status !== "pending") {
    throw new HttpException(
      "Status must be 'pending' when creating a new report",
      400,
    );
  }
  // Check exactly one of postId or commentId - they are optional fields on the Create DTO
  const postId = (body as any).postId as
    | (string & tags.Format<"uuid">)
    | undefined
    | null;
  const commentId = (body as any).commentId as
    | (string & tags.Format<"uuid">)
    | undefined
    | null;
  if (
    (postId != null && commentId != null) ||
    (postId == null && commentId == null)
  ) {
    throw new HttpException(
      "Exactly one of postId or commentId must be provided",
      400,
    );
  }
  // Load report reason
  const reportReason =
    await MyGlobal.prisma.community_platform_report_reasons.findUniqueOrThrow({
      where: { id: body.communityPlatformReportReasonId },
    });
  // Load admin user as reporting user
  const user =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: { id: admin.id },
    });
  // Prepare the report data to insert
  const reportData = await CommunityPlatformReportCollector.collect({
    body,
    user,
    reportReason,
  });
  // Create the report record
  const createdReport = await MyGlobal.prisma.community_platform_reports.create(
    {
      data: reportData,
      ...CommunityPlatformReportTransformer.select(),
    },
  );
  // Create the related reported content record
  if (postId != null) {
    await MyGlobal.prisma.community_platform_reported_contents.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_report_id: createdReport.id,
        community_platform_reported_post_id: postId,
        community_platform_reported_comment_id: null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
  } else if (commentId != null) {
    await MyGlobal.prisma.community_platform_reported_contents.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_report_id: createdReport.id,
        community_platform_reported_post_id: null,
        community_platform_reported_comment_id: commentId,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
  }
  // Reload the created report with relations
  const fullReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: createdReport.id },
      ...CommunityPlatformReportTransformer.select(),
    });
  return await CommunityPlatformReportTransformer.transform(fullReport);
}
