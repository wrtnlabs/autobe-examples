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
import { CommunityPlatformCommunityReportCollector } from "../collectors/CommunityPlatformCommunityReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityReportTransformer } from "../transformers/CommunityPlatformCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformMemberCommunityReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunityReport.ICreate;
}): Promise<ICommunityPlatformCommunityReport> {
  // Resolve the community_id from the target content for ban check
  let communityId: string;
  if (props.body.targetType === "post") {
    const post =
      await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
        where: { id: props.body.targetId },
        select: { community_id: true },
      });
    communityId = post.community_id;
  } else {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
        where: { id: props.body.targetId },
        select: { community_platform_post_id: true },
      });
    const post =
      await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
        where: { id: comment.community_platform_post_id },
        select: { community_id: true },
      });
    communityId = post.community_id;
  }
  // Check if the authenticated member is banned from the target community
  const ban = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      community_platform_community_id: communityId,
      community_platform_member_id: props.member.id,
    },
  });
  if (ban !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // Create the report using the Collector and return with the Transformer
  const record =
    await MyGlobal.prisma.community_platform_community_reports.create({
      data: await CommunityPlatformCommunityReportCollector.collect({
        body: props.body,
        communityPlatformMembers: { id: props.member.id },
        communityPlatformMemberSessions: { id: props.member.session_id },
      }),
      ...CommunityPlatformCommunityReportTransformer.select(),
    });
  return await CommunityPlatformCommunityReportTransformer.transform(record);
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
// export async function postCommunityPlatformMemberCommunityReports(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformCommunityReport.ICreate;
// }): Promise<ICommunityPlatformCommunityReport> {
//   const record = await MyGlobal.prisma.community_platform_community_reports.create({
//     data: await CommunityPlatformCommunityReportCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformCommunityReportTransformer.select(),
//   });
//   return await CommunityPlatformCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------