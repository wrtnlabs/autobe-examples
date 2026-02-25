import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedPreference";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneFeedPreferenceTransformer {
  export type Payload = Prisma.reddit_clone_feed_preferencesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        default_sort_algorithm: true,
        default_time_filter: true,
        community_specific_enabled: true,
      },
    } satisfies Prisma.reddit_clone_feed_preferencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFeedPreference> {
    return {
      default_sort_algorithm: input.default_sort_algorithm,
      default_time_filter:
        input.default_time_filter !== null
          ? (input.default_time_filter as string & tags.Format<"date-time">)
          : null,
      community_specific_enabled: input.community_specific_enabled,
    };
  }
}
