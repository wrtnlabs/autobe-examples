import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_exact_match(
  connection: api.IConnection,
): Promise<void> {
  // Generate search term
  const searchQuery = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  // Search for exact name match
  const response = await api.functional.reddit.communities.index(connection, {
    body: { search: searchQuery },
  });
  typia.assert(response);
  // Verify exact match is first result
  TestValidator.equals(
    "Exact match should be the first result",
    response.data[0].name,
    searchQuery,
  );
  // Verify at least one result
  TestValidator.predicate(
    "Should have at least one search result",
    response.data.length > 0,
  );
}
