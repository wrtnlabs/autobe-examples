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
import { RedditPlatformReportCollector } from "../collectors/RedditPlatformReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberReports(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.ICreate;
}): Promise<IRedditPlatformReport> {
  let communityId: string;
  if (props.body.target_type === "post") {
    const post = await MyGlobal.prisma.reddit_platform_posts.findFirstOrThrow({
      where: { id: props.body.target_id },
      select: { community_id: true },
    });
    communityId = post.community_id;
  } else {
    const comment =
      await MyGlobal.prisma.reddit_platform_comments.findFirstOrThrow({
        where: { id: props.body.target_id },
        select: { reddit_platform_post_id: true },
      });
    const post = await MyGlobal.prisma.reddit_platform_posts.findFirstOrThrow({
      where: { id: comment.reddit_platform_post_id },
      select: { community_id: true },
    });
    communityId = post.community_id;
  }
  const created = await MyGlobal.prisma.reddit_platform_reports.create({
    data: await RedditPlatformReportCollector.collect({
      body: props.body,
      redditPlatformMemberSessions: {
        id: props.member.session_id,
      },
    }),
    ...RedditPlatformReportTransformer.select(),
  });
  return await RedditPlatformReportTransformer.transform(created);
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
// export async function postRedditPlatformMemberReports(props: {
//   member: MemberPayload;
//   body: IRedditPlatformReport.ICreate;
// }): Promise<IRedditPlatformReport> {
//   const record = await MyGlobal.prisma.reddit_platform_reports.create({
//     data: await RedditPlatformReportCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditPlatformReportTransformer.select(),
//   });
//   return await RedditPlatformReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------