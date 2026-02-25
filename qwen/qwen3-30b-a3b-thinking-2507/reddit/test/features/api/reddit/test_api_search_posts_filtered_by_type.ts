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

export async function test_api_search_posts_filtered_by_type(
  connection: api.IConnection,
): Promise<void> {
  const result = await api.functional.reddit.search.posts.index(connection, {
    body: { postType: "image" } satisfies IRedditPostText.IRequest,
  });
  typia.assert(result);
  for (const post of result.data) {
    TestValidator.equals("Post type should be image", post.post_type, "image");
  }
  for (const post of result.data) {
    TestValidator.predicate(
      "Community should be present",
      post.community !== undefined,
    );
    TestValidator.predicate(
      "Author should be present",
      post.author !== undefined,
    );
  }
}
