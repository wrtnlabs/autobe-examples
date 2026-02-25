import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneFeedViewAtRefreshResponseTransformer {
  export type Payload = Prisma.reddit_clone_feed_viewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
      },
    } satisfies Prisma.reddit_clone_feed_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFeedView.IRefreshResponse> {
    return {
      success: "refreshed",
      feedViewId: input.id,
    };
  }
}
