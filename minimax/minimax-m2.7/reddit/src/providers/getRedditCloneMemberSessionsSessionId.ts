import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneMemberSessionTransformer } from "../transformers/RedditCloneMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneMemberSession> {
  const record =
    await MyGlobal.prisma.reddit_clone_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...RedditCloneMemberSessionTransformer.select(),
    });
  if (record.member?.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (Date.now() < record.expired_at.getTime()) {
    throw new HttpException("Session has expired", 410);
  }
  return await RedditCloneMemberSessionTransformer.transform(record);
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
// import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneMemberSessionsSessionId(props: {
//   member: MemberPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneMemberSession> {
//   const record = await MyGlobal.prisma.reddit_clone_member_sessions.findFirstOrThrow({
//     ...RedditCloneMemberSessionTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneMemberSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------