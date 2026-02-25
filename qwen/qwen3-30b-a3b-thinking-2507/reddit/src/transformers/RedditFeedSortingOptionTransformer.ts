import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditFeedSortingOptionTransformer {
  export type Payload = Prisma.reddit_feed_sorting_optionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sort_type: true,
        formula: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        feeds: true,
        preferences: true,
      },
    } satisfies Prisma.reddit_feed_sorting_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditFeedSortingOption> {
    return {
      id: input.id,
      sort_type: input.sort_type,
      formula: input.formula,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
