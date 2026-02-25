import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneContentCommentAtSummaryTransformer } from "./RedditCloneContentCommentAtSummaryTransformer";
import { RedditCloneContentPostAtSummaryTransformer } from "./RedditCloneContentPostAtSummaryTransformer";
import { RedditCloneModeratorAtSummaryTransformer } from "./RedditCloneModeratorAtSummaryTransformer";

export namespace RedditCloneModerationLogTransformer {
  export type Payload = Prisma.reddit_clone_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_type: true,
        reason: true,
        created_at: true,
        moderator: RedditCloneModeratorAtSummaryTransformer.select(),
        post: RedditCloneContentPostAtSummaryTransformer.select(),
        comment: RedditCloneContentCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModerationLog> {
    return {
      id: input.id,
      actionType: input.action_type,
      targetType: input.target_type,
      reason: input.reason ?? null,
      createdAt: toISOStringSafe(input.created_at),
      moderator: await RedditCloneModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      post: input.post
        ? await RedditCloneContentPostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await RedditCloneContentCommentAtSummaryTransformer.transform(
            input.comment,
          )
        : null,
    };
  }
}
