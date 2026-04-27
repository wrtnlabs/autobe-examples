import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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
import { CommunityPlatformReportPostTargetTransformer } from "../transformers/CommunityPlatformReportPostTargetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberReportsReportIdPostTarget(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportPostTarget> {
  // Step 1: Look up the report, ensuring it's not soft-deleted and targets a post
  const report = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: {
      id: props.reportId,
      deleted_at: null,
      target_type: "post",
    },
    select: {
      id: true,
      community_id: true,
    },
  });
  if (report === null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 2: Authorization - check if member is owner or moderator of the community
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: report.community_id },
      select: {
        id: true,
        owner_id: true,
      },
    });
  if (community.owner_id !== props.member.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: report.community_id,
        },
        select: { id: true },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 3: Find the post target and return via Transformer
  const record =
    await MyGlobal.prisma.community_platform_report_post_targets.findFirstOrThrow(
      {
        where: {
          community_platform_report_id: props.reportId,
          deleted_at: null,
        },
        ...CommunityPlatformReportPostTargetTransformer.select(),
      },
    );
  return await CommunityPlatformReportPostTargetTransformer.transform(record);
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
// import { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
// import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityPlatformMemberReportsReportIdPostTarget(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<ICommunityPlatformReportPostTarget> {
//   const record = await MyGlobal.prisma.community_platform_report_post_targets.findFirstOrThrow({
//     ...CommunityPlatformReportPostTargetTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityPlatformReportPostTargetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------