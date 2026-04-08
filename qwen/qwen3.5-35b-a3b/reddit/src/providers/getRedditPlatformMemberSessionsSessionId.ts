import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformMemberSession> {
  const record =
    await MyGlobal.prisma.reddit_platform_member_sessions.findUniqueOrThrow({
      select: {
        id: true,
        reddit_platform_member_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expired_at: true,
        revoked_at: true,
        token: true,
        refresh_token: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
      },
      where: {
        id: props.sessionId,
        deleted_at: null,
      },
    });
  if (record.reddit_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: record.id,
    redditPlatformMemberId: record.reddit_platform_member_id,
    ip: record.ip,
    href: record.href,
    referrer: record.referrer ?? undefined,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt: record.deleted_at?.toISOString() ?? null,
    expiredAt: (
      record.expired_at ?? new Date("9999-12-31T23:59:59.999Z")
    ).toISOString(),
    revokedAt: record.revoked_at?.toISOString() ?? null,
    member: await RedditPlatformMemberAtSummaryTransformer.transform(
      record.member,
    ),
  } satisfies IRedditPlatformMemberSession;
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
// import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberSessionsSessionId(props: {
//   member: MemberPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformMemberSession> {
//   const record = await MyGlobal.prisma.reddit_platform_member_sessions.findFirstOrThrow({
//     ...RedditPlatformMemberSessionTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformMemberSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------