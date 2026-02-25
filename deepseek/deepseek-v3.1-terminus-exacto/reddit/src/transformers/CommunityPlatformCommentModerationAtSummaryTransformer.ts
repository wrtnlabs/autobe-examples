import { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";

export namespace CommunityPlatformCommentModerationAtSummaryTransformer {
  export type Payload = Prisma.community_platform_comment_moderationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        status: true,
        duration_hours: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        moderator: CommunityPlatformModeratorAtSummaryTransformer.select(),
        comment: true,
      },
    } satisfies Prisma.community_platform_comment_moderationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentModeration.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      reason: input.reason,
      status: input.status,
      duration_hours: input.duration_hours,
      created_at: input.created_at.toISOString(),
      moderator: await CommunityPlatformModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
