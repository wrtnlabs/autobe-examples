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

export async function getCommunityHubMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubReport> {
  const report = await MyGlobal.prisma.community_hub_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    ...CommunityHubReportTransformer.select(),
  });
  const moderatorRecord =
    await MyGlobal.prisma.community_hub_community_moderators.findFirst({
      where: {
        community_hub_community_id: report.community.id,
        community_hub_member_id: props.member.id,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityHubReportTransformer.transform(report);
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
// export async function getCommunityHubMemberReportsReportId(props: {
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