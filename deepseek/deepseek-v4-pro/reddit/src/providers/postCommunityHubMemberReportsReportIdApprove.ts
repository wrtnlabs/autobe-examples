import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubReportTransformer } from "../transformers/CommunityHubReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubReport> {
  const report = await MyGlobal.prisma.community_hub_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      target_type: true,
      target_id: true,
      community_hub_community_id: true,
    },
  });
  if (report.status !== "pending") {
    throw new HttpException("Report has already been processed", 409);
  }
  const moderator =
    await MyGlobal.prisma.community_hub_community_moderators.findFirst({
      where: {
        community_hub_community_id: report.community_hub_community_id,
        community_hub_member_id: props.member.id,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date().toISOString();
  const updatedReport = await MyGlobal.prisma.$transaction(async (tx) => {
    if (report.target_type === "post") {
      await tx.community_hub_posts.updateMany({
        where: { id: report.target_id, deleted_at: null },
        data: { deleted_at: now },
      });
    } else if (report.target_type === "comment") {
      const result = await tx.community_hub_comments.updateMany({
        where: { id: report.target_id, deleted_at: null },
        data: { deleted_at: now },
      });
      if (result.count > 0) {
        await tx.community_hub_comments.updateMany({
          where: { community_hub_parent_comment_id: report.target_id },
          data: { community_hub_parent_comment_id: null },
        });
      }
    }
    await tx.community_hub_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        updated_at: now,
      },
    });
    return tx.community_hub_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityHubReportTransformer.select(),
    });
  });
  return CommunityHubReportTransformer.transform(updatedReport);
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
// import { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubMemberReportsReportIdApprove(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubReport> {
//   const record = await MyGlobal.prisma.community_hub_reports.findFirstOrThrow({
//     ...CommunityHubReportTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------