import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostReportTransformer } from "../transformers/RedditCommunityPostReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberPostsPostIdReportsReportId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostReport> {
  const record =
    await MyGlobal.prisma.reddit_community_post_reports.findFirstOrThrow({
      ...RedditCommunityPostReportTransformer.select(),
      where: {
        id: props.reportId,
        reddit_community_post_id: props.postId,
        deleted_at: null,
      },
    });
  const moderatorRole =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_community_id: record.community.id,
        deleted_at: null,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditCommunityPostReportTransformer.transform(record);
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
// import { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberPostsPostIdReportsReportId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityPostReport> {
//   const record = await MyGlobal.prisma.reddit_community_post_reports.findFirstOrThrow({
//     ...RedditCommunityPostReportTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityPostReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------