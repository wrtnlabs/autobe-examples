import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityReportTransformer } from "../transformers/RedditCloneCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberCommunitiesCommunityIdReportsReportId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunityReport> {
  // Authorization: Verify member is a moderator of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: props.communityId,
      },
    });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the report by id and community_id
  const record = await MyGlobal.prisma.reddit_clone_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      reddit_clone_community_id: props.communityId,
    },
    ...RedditCloneCommunityReportTransformer.select(),
  });
  return await RedditCloneCommunityReportTransformer.transform(record);
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
// import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneMemberCommunitiesCommunityIdReportsReportId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneCommunityReport> {
//   const record = await MyGlobal.prisma.reddit_clone_reports.findFirstOrThrow({
//     ...RedditCloneCommunityReportTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------