import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPostText";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_search_posts_sorted_by_hot(
  connection: api.IConnection,
): Promise<void> {
  // Verify sorting by 'hot' returns posts ordered by relevance (upvotes × time factor)
  await TestValidator.sort("posts sorted by hot", async (sortable) => {
    const response = await api.functional.reddit.search.posts.index(
      connection,
      {
        body: { sort: "hot" },
      },
    );
    typia.assert(response);
    return response.data;
  })("vote_count")((a, b) => b.vote_count - a.vote_count)("+");
}
