import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeCommunityMemberReportsReportIdReportOnPostsReportOnPostId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  reportOnPostId: string & tags.Format<"uuid">;
}): Promise<void> {
  const junction =
    await MyGlobal.prisma.reddit_like_community_report_on_posts.findUnique({
      where: { id: props.reportOnPostId },
      select: {
        reddit_like_community_report_id: true,
      },
    });
  if (
    junction === null ||
    junction.reddit_like_community_report_id !== props.reportId
  ) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.reddit_like_community_report_on_posts.delete({
    where: { id: props.reportOnPostId },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditLikeCommunityMemberReportsReportIdReportOnPostsReportOnPostId(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
//   reportOnPostId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------