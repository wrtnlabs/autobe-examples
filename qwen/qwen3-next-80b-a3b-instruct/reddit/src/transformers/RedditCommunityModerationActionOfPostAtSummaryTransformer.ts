import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityModerationActionOfPostAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_moderation_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        action_type: true,
        reason: true,
        created_at: true,
        actor: {
          select: {
            member_display_name: true,
          },
        },
        reddit_community_moderation_action_of_posts: {
          select: {
            target_id: true,
          },
        },
        reddit_community_moderation_action_of_comments: {
          select: {},
        },
      },
    } satisfies Prisma.reddit_community_moderation_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityModerationActionOfPost.ISummary> {
    return {
      action_type: input.action_type as
        | "delete"
        | "ban"
        | "approve"
        | "dismiss",
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      actor_display_name: input.actor?.member_display_name,
      post_id: input.reddit_community_moderation_action_of_posts.target_id,
    };
  }
}
