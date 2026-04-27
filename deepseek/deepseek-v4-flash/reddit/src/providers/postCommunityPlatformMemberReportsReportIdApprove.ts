import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
import { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
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

export async function postCommunityPlatformMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        status: true,
        target_type: true,
        community_id: true,
      },
    });
  if (report.status !== "pending") {
    throw new HttpException("Report is no longer actionable", 400);
  }
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: report.community_id,
        role: { in: ["owner", "moderator"] },
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        updated_at: now,
      },
    });
    if (report.target_type === "post") {
      const postTarget =
        await tx.community_platform_report_post_targets.findUniqueOrThrow({
          where: { community_platform_report_id: props.reportId },
          select: { community_platform_post_id: true },
        });
      await tx.community_platform_posts.update({
        where: { id: postTarget.community_platform_post_id },
        data: { deleted_at: now },
      });
    } else if (report.target_type === "comment") {
      const commentTarget =
        await tx.community_platform_report_comment_targets.findUniqueOrThrow({
          where: { community_platform_report_id: props.reportId },
          select: { community_platform_comment_id: true },
        });
      await tx.community_platform_comments.update({
        where: { id: commentTarget.community_platform_comment_id },
        data: { deleted_at: now },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  return await CommunityPlatformReportTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
// import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberReportsReportIdApprove(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<ICommunityPlatformReport> {
//   const record = await MyGlobal.prisma.community_platform_reports.findFirstOrThrow({
//     ...CommunityPlatformReportTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityPlatformReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------