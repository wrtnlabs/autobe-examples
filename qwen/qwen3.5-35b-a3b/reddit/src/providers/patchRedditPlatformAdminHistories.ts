import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformActivity";
import { IRedditPlatformActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformActivity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminHistories(props: {
  admin: AdminPayload;
  body: IRedditPlatformActivity.IRequest;
}): Promise<IPageIRedditPlatformActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "NEWEST";
  const validatedLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  const validatedPage: number & tags.Type<"int32"> & tags.Minimum<1> =
    page < 1 ? 1 : page;
  const skip = (validatedPage - 1) * validatedLimit;
  const whereConditions: Array<{
    field: string;
    operator?: string;
    value: unknown;
  }> = [];
  if (props.body.activityType !== undefined) {
    whereConditions.push({
      field: "activity_type",
      value: props.body.activityType,
    });
  }
  if (props.body.createdAt !== undefined) {
    whereConditions.push({
      field: "created_at",
      operator: ">=",
      value: props.body.createdAt,
    });
  }
  if (props.body.createdAtEnd !== undefined) {
    whereConditions.push({
      field: "created_at",
      operator: "<=",
      value: props.body.createdAtEnd,
    });
  }
  if (props.body.entityType !== undefined) {
    whereConditions.push({
      field: "entity_type",
      value: props.body.entityType,
    });
  }
  if (props.body.entityId !== undefined) {
    whereConditions.push({ field: "entity_id", value: props.body.entityId });
  }
  const whereClause =
    whereConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(
          whereConditions.map((cond, idx) => {
            if (cond.operator) {
              return Prisma.sql`${Prisma.raw(cond.field)} ${Prisma.raw(cond.operator)} ${Prisma.raw(String(cond.value))}`;
            }
            return Prisma.sql`${Prisma.raw(cond.field)} = ${Prisma.raw(String(cond.value))}`;
          }),
          " AND ",
        )}`
      : Prisma.sql``;
  const orderByClause =
    sort === "OLDEST"
      ? Prisma.sql`ORDER BY created_at ASC`
      : Prisma.sql`ORDER BY created_at DESC`;
  const countResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      total: number;
    }>
  >`
    SELECT COUNT(*)::int as total
    FROM (
      SELECT id, "user_id" as user_id, 'POST_CREATED'::text as activity_type, 'POST'::text as entity_type, post_id as entity_id, created_at, deleted_at
      FROM "reddit_platform_posts"
      WHERE "deleted_at" IS NULL
      UNION ALL
      SELECT id, "author_id" as user_id, 'COMMENT_CREATED'::text as activity_type, 'COMMENT'::text as entity_type, id as entity_id, created_at, deleted_at
      FROM "reddit_platform_comments"
      WHERE "deleted_at" IS NULL
      UNION ALL
      SELECT id, "user_id" as user_id, 'POST_VOTED'::text as activity_type, 'POST'::text as entity_type, post_id as entity_id, created_at, deleted_at
      FROM "reddit_platform_post_votes"
      WHERE "deleted_at" IS NULL
      UNION ALL
      SELECT id, "user_id" as user_id, 'COMMENT_VOTED'::text as activity_type, 'COMMENT'::text as entity_type, comment_id as entity_id, created_at, deleted_at
      FROM "reddit_platform_comment_votes"
      WHERE "deleted_at" IS NULL
      UNION ALL
      SELECT id, "reddit_platform_member_id" as user_id, 'COMMUNITY_SUBSCRIBED'::text as activity_type, 'COMMUNITY'::text as entity_type, reddit_platform_community_id as entity_id, subscribed_at as created_at, deleted_at
      FROM "reddit_platform_community_subscriptions"
      WHERE "deleted_at" IS NULL
    ) AS activities
    ${whereClause}
  `;
  const total: number & tags.Type<"int32"> & tags.Minimum<0> =
    countResult[0]?.total ?? 0;
  const activityResults = await MyGlobal.prisma.$queryRaw<
    Array<{
      id: string;
      user_id: string;
      activity_type: string;
      entity_type: string;
      entity_id: string;
      created_at: string & tags.Format<"date-time">;
    }>
  >`
    SELECT
      activities.id,
      activities.user_id,
      activities.activity_type,
      activities.entity_type,
      activities.entity_id,
      activities.created_at
    FROM (
      SELECT id, "user_id" as user_id, 'POST_CREATED'::text as activity_type, 'POST'::text as entity_type, post_id as entity_id, created_at
      FROM "reddit_platform_posts"
      WHERE "deleted_at" IS NULL
      UNION ALL
      SELECT id, "author_id" as user_id, 'COMMENT_CREATED'::text as activity_type, 'COMMENT'::text as entity_type, id as entity_id, created_at
      FROM "reddit_platform_comments"
      WHERE "deleted_at" IS NULL
      UNION ALL
      SELECT id, "user_id" as user_id, 'POST_VOTED'::text as activity_type, 'POST'::text as entity_type, post_id as entity_id, created_at
      FROM "reddit_platform_post_votes"
      WHERE "deleted_at" IS NULL
      UNION ALL
      SELECT id, "user_id" as user_id, 'COMMENT_VOTED'::text as activity_type, 'COMMENT'::text as entity_type, comment_id as entity_id, created_at
      FROM "reddit_platform_comment_votes"
      WHERE "deleted_at" IS NULL
      UNION ALL
      SELECT id, "reddit_platform_member_id" as user_id, 'COMMUNITY_SUBSCRIBED'::text as activity_type, 'COMMUNITY'::text as entity_type, reddit_platform_community_id as entity_id, subscribed_at as created_at
      FROM "reddit_platform_community_subscriptions"
      WHERE "deleted_at" IS NULL
    ) AS activities
    ${whereClause}
    ${orderByClause}
    LIMIT ${validatedLimit}
    OFFSET ${skip}
  `;
  const uniqueUserIds = Array.from(
    new Set(activityResults.map((r) => r.user_id)),
  );
  const membersById = new Map<string, IRedditPlatformMember.ISummary>();
  for (const userId of uniqueUserIds) {
    const member =
      await MyGlobal.prisma.reddit_platform_members.findFirstOrThrow({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
          created_at: true,
        },
      });
    const subscriptions =
      await MyGlobal.prisma.reddit_platform_community_subscriptions.count({
        where: { reddit_platform_member_id: userId, deleted_at: null },
      });
    membersById.set(userId, {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      displayName: member.display_name,
      bio: member.bio,
      avatarUrl: member.avatar_url,
      karmaScore: member.karma_score,
      createdAt: toISOStringSafe(member.created_at),
      subscriptionCount: subscriptions,
    });
  }
  const postIds = activityResults
    .filter((r) => r.entity_type === "POST")
    .map((r) => r.entity_id);
  const postsById = new Map<string, IRedditPlatformPost.ISummary>();
  if (postIds.length > 0) {
    const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
      where: {
        id: {
          in: postIds,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        post_type: true,
        vote_score: true,
        comment_count: true,
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            owner_id: true,
            created_at: true,
          },
        },
        created_at: true,
        deleted_at: true,
      },
    });
    for (const post of posts) {
      postsById.set(post.id, {
        id: post.id as string & tags.Format<"uuid">,
        title: post.title,
        post_type: post.post_type,
        vote_score: post.vote_score,
        comment_count: post.comment_count,
        author: membersById.get(post.author.id)!,
        community: {
          id: post.community.id as string & tags.Format<"uuid">,
          name: post.community.name,
          description: post.community.description,
          icon_url: post.community.icon_url,
          subscriber_count: post.community.subscriber_count,
          author: membersById.get(post.community.owner_id)!,
          created_at: toISOStringSafe(post.community.created_at),
        } satisfies IRedditPlatformCommunity.ISummary,
        created_at: toISOStringSafe(post.created_at),
        deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
      });
    }
  }
  const data = activityResults.map((record) => {
    const actor = membersById.get(record.user_id)!;
    const entity =
      record.entity_type === "POST"
        ? (postsById.get(record.entity_id) ?? null)
        : undefined;
    const activitySummary: IRedditPlatformActivity.ISummary = {
      id: record.id as string & tags.Format<"uuid">,
      activity_type: record.activity_type as
        | "POST_CREATED"
        | "COMMENT_CREATED"
        | "POST_VOTED"
        | "COMMENT_VOTED"
        | "COMMUNITY_SUBSCRIBED",
      entity_type: record.entity_type as "POST" | "COMMENT" | "COMMUNITY",
      entity_id: record.entity_id as string & tags.Format<"uuid">,
      actor: actor,
      entity: entity,
      created_at: record.created_at,
    };
    return activitySummary;
  });
  const pages: number & tags.Type<"int32"> & tags.Minimum<0> =
    total === 0 ? 0 : Math.ceil(total / validatedLimit);
  return {
    data: data,
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformActivity.ISummary;
}
