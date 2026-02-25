import { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformSystemNotificationCollector {
  export async function collect(props: {
    body: ICommunityPlatformSystemNotification.ICreate;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      notification_type: props.body.notification_type,
      title: props.body.title,
      message: props.body.message,
      priority: props.body.priority,
      status: props.body.status,
      is_broadcast: props.body.is_broadcast,
      action_url: props.body.action_url ?? null,
      created_at: new Date(),
      processed_at: null,
      // Optional BelongsTo relations
      relatedCommunity: props.body.related_community_id
        ? { connect: { id: props.body.related_community_id } }
        : undefined,
      relatedPost: props.body.related_post_id
        ? { connect: { id: props.body.related_post_id } }
        : undefined,
      relatedComment: props.body.related_comment_id
        ? { connect: { id: props.body.related_comment_id } }
        : undefined,
      // Has relations (not applicable for creation)
      userDelivery: undefined,
      moderatorDelivery: undefined,
      adminDeliveries: undefined,
      broadcastDeliveries: undefined,
    } satisfies Prisma.community_platform_system_notificationsCreateInput;
  }
}
