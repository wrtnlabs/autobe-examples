import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscriptionAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionAuditLog";
import { IPageICommunityPlatformSubscriptionAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserCommunitySubscriptionsCommunitySubscriptionIdAuditLogs(props: {
  user: UserPayload;
  communitySubscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscriptionAuditLog.IRequest;
}): Promise<IPageICommunityPlatformSubscriptionAuditLog.ISummary> {
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: props.communitySubscriptionId },
        select: { user_id: true, community_id: true },
      },
    );
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  if (subscription.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // 2. Build the audit log query filters
  const filters: {
    user_id?: string & tags.Format<"uuid">;
    community_id: string;
    action?: string;
    created_at?: {
      lte?: string & tags.Format<"date-time">;
      gte?: string & tags.Format<"date-time">;
    };
  } = {
    user_id: props.body.user_id ?? undefined,
    community_id: subscription.community_id,
    action: props.body.action ?? undefined,
    created_at:
      props.body.from || props.body.to
        ? {
            ...(props.body.from ? { gte: props.body.from } : {}),
            ...(props.body.to ? { lte: props.body.to } : {}),
          }
        : undefined,
  };
  // Remove keys with undefined or (for created_at) empty object
  for (const key of Object.keys(filters)) {
    // Key narrow
    const typedKey = key as keyof typeof filters;
    if (
      filters[typedKey] === undefined ||
      (typedKey === "created_at" &&
        filters[typedKey] &&
        typeof filters[typedKey] === "object" &&
        Object.keys(filters[typedKey] as object).length === 0)
    ) {
      delete filters[typedKey];
    }
  }

  // 3. Pagination
  const limitRaw = props.body.limit ?? 50;
  const offset = props.body.offset ?? 0;
  // 'limit' property may require tags: Use satisfies pattern
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> =
    limitRaw satisfies number as number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>;

  // 4. Fetch audit logs and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_subscription_audit_logs.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_subscription_audit_logs.count({
      where: filters,
    }),
  ]);

  // 5. Bulk-resolve user, community, post, comment summaries
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const communityIds = Array.from(
    new Set(
      rows.map((row) => row.community_id).filter((x): x is string => x != null),
    ),
  );
  const postIds = Array.from(
    new Set(
      rows.map((row) => row.post_id).filter((x): x is string => x != null),
    ),
  );
  const commentIds = Array.from(
    new Set(
      rows.map((row) => row.comment_id).filter((x): x is string => x != null),
    ),
  );

  // Query related entities in bulk
  const [users, communities, posts, comments] = await Promise.all([
    userIds.length
      ? MyGlobal.prisma.community_platform_users.findMany({
          where: { id: { in: userIds } },
        })
      : Promise.resolve([]),
    communityIds.length
      ? MyGlobal.prisma.community_platform_communities.findMany({
          where: { id: { in: communityIds } },
        })
      : Promise.resolve([]),
    postIds.length
      ? MyGlobal.prisma.community_platform_posts.findMany({
          where: { id: { in: postIds } },
        })
      : Promise.resolve([]),
    commentIds.length
      ? MyGlobal.prisma.community_platform_comments.findMany({
          where: { id: { in: commentIds } },
        })
      : Promise.resolve([]),
  ]);

  // Index for quick lookup
  const userMap = Object.fromEntries(
    users.map((user) => [user.id, { id: user.id }]),
  );
  const communityMap = Object.fromEntries(
    communities.map((community) => [
      community.id,
      {
        id: community.id,
        name: community.name,
        display_title: community.display_title,
        description: community.description,
        visibility: community.visibility,
        image_url: community.image_url ?? undefined,
        status: community.status,
      },
    ]),
  );
  const postMap = Object.fromEntries(
    posts.map((post) => [
      post.id,
      {
        id: post.id,
        community_id: post.community_id,
        community: communityMap[post.community_id],
        user_id: post.user_id,
        user: userMap[post.user_id],
      },
    ]),
  );
  const commentMap = Object.fromEntries(
    comments.map((comment) => [
      comment.id,
      {
        id: comment.id,
        user: userMap[comment.user_id],
        post: postMap[comment.post_id],
        parent_id: comment.parent_id ?? undefined,
        created_at: toISOStringSafe(comment.created_at),
      },
    ]),
  );

  // 6. Map audit logs to ISummary
  const data = rows.map((log) => ({
    id: log.id,
    user: userMap[log.user_id],
    community: log.community_id
      ? (communityMap[log.community_id] ?? null)
      : undefined,
    post: log.post_id ? (postMap[log.post_id] ?? null) : undefined,
    comment: log.comment_id ? (commentMap[log.comment_id] ?? null) : undefined,
    action: log.action,
    action_metadata: log.action_metadata ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    data,
    pagination: {
      current: offset / limit + 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
