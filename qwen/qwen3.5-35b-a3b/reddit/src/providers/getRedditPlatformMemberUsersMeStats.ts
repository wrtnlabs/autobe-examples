import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function getRedditPlatformMemberUsersMeStats(props: {
  member: MemberPayload;
}): Promise<IRedditPlatformMember.IStat> {
  const memberId: string & tags.Format<"uuid"> = props.member.id;
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: memberId },
      select: {
        id: true,
        username: true,
        karma: true,
        created_at: true,
      },
    });
  const postCountResult = await MyGlobal.prisma.reddit_platform_posts.aggregate(
    {
      where: {
        author_id: memberId,
        deleted_at: null,
      },
      _count: { id: true },
    },
  );
  const commentCountResult =
    await MyGlobal.prisma.reddit_platform_comments.aggregate({
      where: {
        reddit_platform_member_id: memberId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const communityCountResult =
    await MyGlobal.prisma.reddit_platform_communities.aggregate({
      where: {
        owner_id: memberId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const subscriptionCountResult =
    await MyGlobal.prisma.reddit_platform_subscriptions.aggregate({
      where: {
        user_id: memberId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const createdDate = new Date(member.created_at);
  const currentDate = new Date();
  const accountAgeDays: number = Math.floor(
    (currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const recentPost = await MyGlobal.prisma.reddit_platform_posts.findFirst({
    where: {
      author_id: memberId,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    select: { created_at: true },
  });
  const recentComment =
    await MyGlobal.prisma.reddit_platform_comments.findFirst({
      where: {
        reddit_platform_member_id: memberId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    });
  let lastActiveAt: (string & tags.Format<"date-time">) | null = null;
  if (recentPost && recentComment) {
    const postTime = new Date(recentPost.created_at).getTime();
    const commentTime = new Date(recentComment.created_at).getTime();
    lastActiveAt =
      postTime > commentTime
        ? recentPost.created_at.toISOString()
        : recentComment.created_at.toISOString();
  } else if (recentPost) {
    lastActiveAt = recentPost.created_at.toISOString();
  } else if (recentComment) {
    lastActiveAt = recentComment.created_at.toISOString();
  }
  return {
    id: member.id,
    username: member.username,
    karma: member.karma,
    post_count: postCountResult._count.id,
    comment_count: commentCountResult._count.id,
    community_count: communityCountResult._count.id,
    subscription_count: subscriptionCountResult._count.id,
    account_age_days: accountAgeDays,
    last_active_at: lastActiveAt,
  } satisfies IRedditPlatformMember.IStat;
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
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberUsersMeStats(props: {
//   member: MemberPayload;
// }): Promise<IRedditPlatformMember.IStat> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------