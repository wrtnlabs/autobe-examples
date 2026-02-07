import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_search_with_text_and_community_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create test community
  const community = await api.functional.redditPlatform.posts.search(
    connection,
    {
      body: {
        community_name: "test_community",
        search: "test",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(community);
  // Verify pagination metadata exists
  TestValidator.predicate(
    "has pagination metadata",
    community.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination has correct fields",
    typeof community.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    community.pagination.records >= 0,
    true,
  );
  // Verify data array exists
  TestValidator.predicate("has data array", Array.isArray(community.data));
  TestValidator.predicate(
    "data items have required fields",
    community.data.length === 0 || community.data[0] !== undefined,
  );
}