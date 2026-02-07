import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_search_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Perform search with guaranteed non-matching keyword
  const result = await api.functional.redditPlatform.search.comments.index(
    connection,
    {
      body: {
        // Search for comments - empty request body as per IRedditPlatformComment.IRequest definition
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  // Validate response structure
  typia.assert(result);
  // Verify result structure
  TestValidator.predicate(
    "has valid pagination",
    result.pagination !== null && result.pagination !== undefined,
  );
  TestValidator.predicate("has valid data array", Array.isArray(result.data));
}
