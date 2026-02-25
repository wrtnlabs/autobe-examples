import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditFeedSortingOptionAtSummaryTransformer } from "./RedditFeedSortingOptionAtSummaryTransformer";

export namespace RedditFeedTransformer {
  export type Payload = Prisma.reddit_feedsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        type: true,
        visibility_rules: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sortingOption: RedditFeedSortingOptionAtSummaryTransformer.select(),
        preferences: {} satisfies Prisma.reddit_feed_preferencesFindManyArgs,
        views: {} satisfies Prisma.reddit_feedsFindManyArgs,
      },
    } satisfies Prisma.reddit_feedsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditFeed> {
    return {
      id: input.id,
      type: input.type,
      visibility_rules: input.visibility_rules,
      sortingOption:
        await RedditFeedSortingOptionAtSummaryTransformer.transform(
          input.sortingOption,
        ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
