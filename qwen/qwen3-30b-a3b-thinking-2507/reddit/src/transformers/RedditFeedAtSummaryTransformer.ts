import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditFeedSortingOptionAtSummaryTransformer } from "./RedditFeedSortingOptionAtSummaryTransformer";

export namespace RedditFeedAtSummaryTransformer {
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
        sortingOption: RedditFeedSortingOptionAtSummaryTransformer.select(),
        deleted_at: true,
        preferences: {
          select: {},
        },
        views: {
          select: {},
        },
      },
    } satisfies Prisma.reddit_feedsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditFeed.ISummary> {
    return {
      id: input.id,
      type: input.type,
      visibility_rules: input.visibility_rules,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      sortingOption:
        await RedditFeedSortingOptionAtSummaryTransformer.transform(
          input.sortingOption,
        ),
    };
  }
}
