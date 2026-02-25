import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import { IRedditFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedPreference";
import { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditFeedAtSummaryTransformer } from "./RedditFeedAtSummaryTransformer";
import { RedditFeedSortingOptionAtSummaryTransformer } from "./RedditFeedSortingOptionAtSummaryTransformer";
import { RedditMemberAtSummaryTransformer } from "./RedditMemberAtSummaryTransformer";

export namespace RedditFeedPreferenceAtSummaryTransformer {
  export type Payload = Prisma.reddit_feed_preferencesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: RedditMemberAtSummaryTransformer.select(),
        feed: RedditFeedAtSummaryTransformer.select(),
        sortOrder: RedditFeedSortingOptionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_feed_preferencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditFeedPreference.ISummary> {
    return {
      id: input.id,
      user: await RedditMemberAtSummaryTransformer.transform(input.user),
      feed: await RedditFeedAtSummaryTransformer.transform(input.feed),
      sortOrder: await RedditFeedSortingOptionAtSummaryTransformer.transform(
        input.sortOrder,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
