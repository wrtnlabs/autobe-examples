import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityReportResolutionTransformer } from "../transformers/CommunityReportResolutionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberReportsReportIdResolution(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityReportResolution.ICreate;
}): Promise<ICommunityReportResolution> {
  // Step 1: Fetch the report to get community_id and validate
  const report = await MyGlobal.prisma.community_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      content_type: true,
      content_id: true,
      status: true,
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  // Step 2: Check if report is already resolved
  if (report.status !== "PENDING") {
    throw new HttpException("Report has already been resolved", 409);
  }
  // Step 3: Verify member is a moderator of the community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: report.community_id,
      member_id: props.member.id,
    },
  });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Process action within transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete content if APPROVE
    if (props.body.action === "APPROVE") {
      if (report.content_type === "POST") {
        await tx.community_posts.delete({
          where: { id: report.content_id },
        });
      } else if (report.content_type === "COMMENT") {
        await tx.community_comments.delete({
          where: { id: report.content_id },
        });
      }
    }
    // Create resolution record
    const resolution = await tx.community_report_resolutions.create({
      data: {
        id: v4(),
        action: props.body.action,
        notes: props.body.notes ?? null,
        created_at: new Date(),
        report: { connect: { id: report.id } },
        moderator: { connect: { id: props.member.id } },
      },
      ...CommunityReportResolutionTransformer.select(),
    });
    // Update report status
    const newStatus =
      props.body.action === "APPROVE" ? "APPROVED" : "DISMISSED";
    await tx.community_reports.update({
      where: { id: report.id },
      data: {
        status: newStatus,
        updated_at: new Date(),
      },
    });
    return resolution;
  });
  return await CommunityReportResolutionTransformer.transform(result);
}
