import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformModerationQueueCollector {
  export async function collect(props: {
    body: ICommunityPlatformModerationQueue.ICreate;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      status: props.body.status,
      priority: props.body.priority,
      assigned_at: null,
      review_started_at: null,
      resolved_at: null,
      resolution: props.body.resolution ?? null,
      resolution_reason: props.body.resolution_reason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      // Optional belongsTo relations
      moderator: undefined,
      post: props.body.community_platform_post_id
        ? { connect: { id: props.body.community_platform_post_id } }
        : undefined,
      comment: props.body.community_platform_comment_id
        ? { connect: { id: props.body.community_platform_comment_id } }
        : undefined,
    } satisfies Prisma.community_platform_moderation_queuesCreateInput;
  }
}
