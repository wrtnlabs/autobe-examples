import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUserStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserStat";
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

export async function getRedditPlatformMemberUsersUsernameStats(props: {
  member: MemberPayload;
  username: string;
}): Promise<IRedditPlatformUserStat> {
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });
  const [posts_count, comments_count, subscriptions_count] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.count({
      where: {
        author_id: member.id,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.reddit_platform_comments.count({
      where: {
        reddit_platform_member_id: member.id,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.reddit_platform_subscriptions.count({
      where: {
        user_id: member.id,
        deleted_at: null,
      },
    }),
  ]);
  return {
    karma: member.karma,
    posts_count: posts_count,
    comments_count: comments_count,
    subscriptions_count: subscriptions_count,
  } satisfies IRedditPlatformUserStat;
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
// import { IRedditPlatformUserStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserStat";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberUsersUsernameStats(props: {
//   member: MemberPayload;
//   username: string;
// }): Promise<IRedditPlatformUserStat> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------