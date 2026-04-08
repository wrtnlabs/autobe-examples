import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityMemberSessionAtFullTransformer } from "../transformers/RedditCommunityMemberSessionAtFullTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityMemberSession.IFull> {
  const record =
    await MyGlobal.prisma.reddit_community_member_sessions.findFirstOrThrow({
      ...RedditCommunityMemberSessionAtFullTransformer.select(),
      where: {
        id: props.sessionId,
        deleted_at: null,
      },
    });
  return await RedditCommunityMemberSessionAtFullTransformer.transform(record);
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
// import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberSessionsSessionId(props: {
//   member: MemberPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityMemberSession.IFull> {
//   const record = await MyGlobal.prisma.reddit_community_member_sessions.findFirstOrThrow({
//     ...RedditCommunityMemberSessionAtFullTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityMemberSessionAtFullTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------