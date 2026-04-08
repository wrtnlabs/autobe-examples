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
import { RedditCommunityReportCollector } from "../collectors/RedditCommunityReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPostsPostIdReports(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.ICreate;
}): Promise<IRedditCommunityReport> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community: {
        select: {
          id: true,
        },
      },
    },
  });
  const existingReport =
    await MyGlobal.prisma.reddit_community_reports.findUnique({
      where: {
        reporter_id_target_post_id: {
          reporter_id: props.member.id,
          target_post_id: props.postId,
        },
      },
    });
  if (existingReport !== null) {
    throw new HttpException("Report already exists", 409);
  }
  const reporter: {
    id: string & tags.Format<"uuid">;
  } = { id: props.member.id };
  const community: {
    id: string & tags.Format<"uuid">;
  } = { id: post.community.id };
  const targetPost: {
    id: string & tags.Format<"uuid">;
  } = { id: props.postId };
  const created = await MyGlobal.prisma.reddit_community_reports.create({
    data: await RedditCommunityReportCollector.collect({
      body: props.body,
      reporter,
      community,
      targetPost,
      targetComment: undefined,
    }),
    ...RedditCommunityReportTransformer.select(),
  });
  return await RedditCommunityReportTransformer.transform(created);
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
// export async function postRedditCommunityMemberPostsPostIdReports(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCommunityReport.ICreate;
// }): Promise<IRedditCommunityReport> {
//   const record = await MyGlobal.prisma.reddit_community_reports.create({
//     data: await RedditCommunityReportCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCommunityReportTransformer.select(),
//   });
//   return await RedditCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------