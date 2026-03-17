import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunitiesCommunityIdReportsReportId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IUpdate;
}): Promise<ICommunityPlatformReport> {
  // Step 1: Verify moderator privileges
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Fetch the report and verify pending status
  const report = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: {
      id: props.reportId,
      community_id: props.communityId,
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 409);
  }
  // Step 3: Handle approve action - soft delete target content
  const now = new Date();
  if (props.body.action === "approve") {
    if (report.target_type === "post") {
      const reportPost =
        await MyGlobal.prisma.community_platform_report_posts.findUnique({
          where: { report_id: props.reportId },
        });
      if (reportPost !== null) {
        await MyGlobal.prisma.community_platform_posts.update({
          where: { id: reportPost.post_id },
          data: { deleted_at: now },
        });
      }
    } else {
      const reportComment =
        await MyGlobal.prisma.community_platform_report_comments.findUnique({
          where: { report_id: props.reportId },
        });
      if (reportComment !== null) {
        await MyGlobal.prisma.community_platform_comments.update({
          where: { id: reportComment.comment_id },
          data: { deleted_at: now },
        });
      }
    }
  }
  // Step 4: Update the report status
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.action,
      resolved_by_id: props.member.id,
      resolved_at: now,
      updated_at: now,
    },
  });
  // Step 5: Fetch and return updated report using transformer
  const updatedReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  return await CommunityPlatformReportTransformer.transform(updatedReport);
}
