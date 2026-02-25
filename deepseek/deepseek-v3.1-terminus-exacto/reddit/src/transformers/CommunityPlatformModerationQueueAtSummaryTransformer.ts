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

export namespace CommunityPlatformModerationQueueAtSummaryTransformer {
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
        comment: CommunityPlatformCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_moderation_queuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationQueue.ISummary> {
    return {
      id: input.id,
      status: input.status,
      priority: input.priority,
      assigned_at: toISOStringSafe(input.assigned_at ?? new Date()),
      review_started_at: toISOStringSafe(input.review_started_at ?? new Date()),
      resolved_at: toISOStringSafe(input.resolved_at ?? new Date()),
      resolution: input.resolution ?? null,
      resolution_reason: input.resolution_reason ?? null,
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
