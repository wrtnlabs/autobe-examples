import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberPostsPostIdCommentsCommentIdReportsReportId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  const record =
    await MyGlobal.prisma.reddit_community_reports.findFirstOrThrow({
      ...RedditCommunityReportTransformer.select(),
      where: {
        id: props.reportId,
        deleted_at: null,
        target_comment_id: props.commentId,
        target_post_id: props.postId,
      },
    });
  const moderatorRole =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_community_id: record.community.id,
      },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditCommunityReportTransformer.transform(record);
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
// import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberPostsPostIdCommentsCommentIdReportsReportId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityReport> {
//   const record = await MyGlobal.prisma.reddit_community_reports.findFirstOrThrow({
//     ...RedditCommunityReportTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------