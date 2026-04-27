import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityReportTransformer } from "../transformers/CommunityPlatformCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunityReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityReport.IUpdate;
}): Promise<ICommunityPlatformCommunityReport> {
  const report =
    await MyGlobal.prisma.community_platform_community_reports.findUniqueOrThrow(
      {
        where: { id: props.reportId },
        select: {
          id: true,
          community_id: true,
          status: true,
          target_type: true,
          target_post_id: true,
          target_comment_id: true,
        },
      },
    );
  const moderation =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: report.community_id,
      },
    });
  if (moderation === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is already resolved", 409);
  }
  if (props.body.status === undefined) {
    throw new HttpException("Status is required", 400);
  }
  if (props.body.status === "approved") {
    if (report.target_type === "post" && report.target_post_id !== null) {
      await MyGlobal.prisma.community_platform_posts.delete({
        where: { id: report.target_post_id },
      });
    } else if (
      report.target_type === "comment" &&
      report.target_comment_id !== null
    ) {
      await MyGlobal.prisma.community_platform_comments.delete({
        where: { id: report.target_comment_id },
      });
    }
  }
  await MyGlobal.prisma.community_platform_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.community_platform_community_reports.findUniqueOrThrow(
      {
        where: { id: props.reportId },
        ...CommunityPlatformCommunityReportTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityReportTransformer.transform(updated);
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
// import { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putCommunityPlatformMemberCommunityReportsReportId(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformCommunityReport.IUpdate;
// }): Promise<ICommunityPlatformCommunityReport> {
//   await MyGlobal.prisma.community_platform_community_reports.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_platform_community_reports.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityPlatformCommunityReportTransformer.select(),
//   });
//   return await CommunityPlatformCommunityReportTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------