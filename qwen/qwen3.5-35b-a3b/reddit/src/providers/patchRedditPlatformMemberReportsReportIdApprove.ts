import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
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

export async function patchRedditPlatformMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReport> {
  // Begin transaction for atomic content deletion and report update
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Fetch report with full transformation select
    const report = await tx.reddit_platform_reports.findFirstOrThrow({
      ...RedditPlatformReportTransformer.select(),
      where: {
        id: props.reportId,
      },
    });
    // Validate report is in pending status
    if (report.status !== "pending") {
      throw new HttpException("Report has already been processed", 409);
    }
    // Validate caller is moderator of the community
    const membership = await tx.reddit_platform_community_members.findFirst({
      where: {
        user_id: props.member.id,
        community_id: report.community.id,
        role: "moderator",
        deleted_at: null,
      },
    });
    if (!membership) {
      throw new HttpException("Forbidden", 403);
    }
    // Verify and delete the reported content based on target_type
    if (report.target_type === "post") {
      const existingPost = await tx.reddit_platform_posts.findUnique({
        where: {
          id: report.target_id.toString(),
        },
      });
      if (!existingPost) {
        throw new HttpException("Reported post not found", 404);
      }
      await tx.reddit_platform_posts.delete({
        where: {
          id: existingPost.id,
        },
      });
    } else if (report.target_type === "comment") {
      const existingComment = await tx.reddit_platform_comments.findUnique({
        where: {
          id: report.target_id.toString(),
        },
      });
      if (!existingComment) {
        throw new HttpException("Reported comment not found", 404);
      }
      await tx.reddit_platform_comments.delete({
        where: {
          id: existingComment.id,
        },
      });
    } else {
      throw new HttpException("Invalid target type", 400);
    }
    // Update the report with approval details
    const approvedReport = await tx.reddit_platform_reports.update({
      where: { id: report.id },
      data: {
        status: "approved",
        reviewed_by: props.member.session_id,
        reviewed_at: new Date(),
        updated_at: new Date(),
      },
    });
    return approvedReport;
  });
  // Fetch the approved report with full transformation
  const finalReport =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditPlatformReportTransformer.select(),
    });
  return await RedditPlatformReportTransformer.transform(finalReport);
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
// import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
// import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberReportsReportIdApprove(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformReport> {
//   const record = await MyGlobal.prisma.reddit_platform_reports.findFirstOrThrow({
//     ...RedditPlatformReportTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------