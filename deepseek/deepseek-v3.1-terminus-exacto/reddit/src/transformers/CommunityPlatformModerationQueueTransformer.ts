import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformModerationQueueTransformer {
  export type Payload = Prisma.community_platform_moderation_queuesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        priority: true,
        assigned_at: true,
        review_started_at: true,
        resolved_at: true,
        resolution: true,
        resolution_reason: true,
        created_at: true,
        updated_at: true,
        moderator: CommunityPlatformModeratorAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        comment: {
          select: {
            id: true,
            content: true,
            created_at: true,
            updated_at: true,
            is_deleted: true,
            deleted_at: true,
            author: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
                karma: true,
                created_at: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
                post_type: true,
                created_at: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    avatar_url: true,
                    karma: true,
                    created_at: true,
                  },
                },
                community: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    icon_url: true,
                    created_at: true,
                    owner: {
                      select: {
                        id: true,
                        username: true,
                        display_name: true,
                        avatar_url: true,
                        karma: true,
                        created_at: true,
                      },
                    },
                  },
                },
              },
            },
            parent: true,
            auditLogs: { select: { id: true } },
            activities: { select: { id: true } },
            systemNotificationComments: { select: { id: true } },
            moderationQueues: { select: { id: true } },
            replies: { select: { id: true } },
            moderations: { select: { id: true } },
            snapshots: { select: { id: true } },
            editHistories: { select: { id: true } },
            childHierarchies: { select: { id: true } },
            parentHierarchies: { select: { id: true } },
            votes: { select: { id: true } },
            commentScore: { select: { id: true } },
          },
        },
      },
    } satisfies Prisma.community_platform_moderation_queuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationQueue> {
    return {
      id: input.id,
      status: input.status,
      priority: input.priority,
      assigned_at: input.assigned_at
        ? toISOStringSafe(input.assigned_at)
        : null,
      review_started_at: input.review_started_at
        ? toISOStringSafe(input.review_started_at)
        : null,
      resolved_at: input.resolved_at
        ? toISOStringSafe(input.resolved_at)
        : null,
      resolution: input.resolution ?? null,
      resolution_reason: input.resolution_reason ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      moderator: input.moderator
        ? await CommunityPlatformModeratorAtSummaryTransformer.transform(
            input.moderator,
          )
        : null,
      post: input.post
        ? await CommunityPlatformPostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.comment,
          )
        : null,
    };
  }
}
