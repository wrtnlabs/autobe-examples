import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformSystemNotificationTransformer {
  export type Payload =
    Prisma.community_platform_system_notificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        notification_type: true,
        title: true,
        message: true,
        priority: true,
        status: true,
        is_broadcast: true,
        action_url: true,
        created_at: true,
        processed_at: true,
        relatedCommunity:
          CommunityPlatformCommunityAtSummaryTransformer.select(),
        relatedPost: CommunityPlatformPostAtSummaryTransformer.select(),
        relatedComment: CommunityPlatformCommentAtSummaryTransformer.select(),
        userDelivery: true,
        moderatorDelivery: true,
        adminDeliveries: true,
        broadcastDeliveries: true,
      },
    } satisfies Prisma.community_platform_system_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSystemNotification> {
    return {
      id: input.id,
      notification_type: input.notification_type,
      title: input.title,
      message: input.message,
      priority: input.priority,
      status: input.status,
      is_broadcast: input.is_broadcast,
      action_url: input.action_url ?? undefined,
      related_community_id: input.relatedCommunity?.id ?? undefined,
      related_post_id: input.relatedPost?.id ?? undefined,
      related_comment_id: input.relatedComment?.id ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      processed_at: input.processed_at
        ? toISOStringSafe(input.processed_at)
        : undefined,
      relatedCommunity: input.relatedCommunity
        ? await CommunityPlatformCommunityAtSummaryTransformer.transform(
            input.relatedCommunity,
          )
        : undefined,
      relatedPost: input.relatedPost
        ? await CommunityPlatformPostAtSummaryTransformer.transform(
            input.relatedPost,
          )
        : undefined,
      relatedComment: input.relatedComment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.relatedComment,
          )
        : undefined,
    };
  }
}
