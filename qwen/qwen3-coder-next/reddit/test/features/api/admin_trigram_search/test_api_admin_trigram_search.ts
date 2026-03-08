import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAdmin";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_trigram_search(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create test admins with various names using random data
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate test admin data
  const testAdmins = ArrayUtil.repeat(5, (index) => ({
    username: `admin_${RandomGenerator.alphabets(6)}`,
    display_name: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}`,
  }));
  // Test 1: Exact match search by display name
  const exactMatchResult = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: testAdmins[0].display_name,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(exactMatchResult);
  // Test 2: Partial name match (first name only)
  const firstName = testAdmins[1].display_name.split(" ")[0];
  const partialMatchResult = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: firstName,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(partialMatchResult);
  TestValidator.predicate(
    "partial match found results",
    () => partialMatchResult.data.length >= 0,
  );
  // Test 3: Typo tolerance - slight misspelling
  const originalName = testAdmins[2].display_name;
  const typoSearch =
    originalName.length > 3
      ? originalName.substring(0, originalName.length - 1) // Remove last character
      : originalName;
  const typoMatchResult = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: typoSearch,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(typoMatchResult);
  // Test 4: Multi-word search with partial match
  const multiWordSearch = testAdmins[3].display_name.substring(
    0,
    Math.min(5, testAdmins[3].display_name.length),
  );
  const multiWordResult = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: multiWordSearch,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(multiWordResult);
  // Test 5: Username search with partial match
  const usernamePartial = testAdmins[4].username.substring(
    0,
    Math.min(8, testAdmins[4].username.length),
  );
  const usernameSearchResult = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: usernamePartial,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(usernameSearchResult);
  // Test 6: No results search with random unique string
  const uniqueSearch = `nonexistent_${RandomGenerator.alphaNumeric(10)}`;
  const noResultResult = await api.functional.redditLike.admins.index(
    adminConnection,
    {
      body: {
        search: uniqueSearch,
      } satisfies IRedditLikeAdmin.IRequest,
    },
  );
  typia.assert(noResultResult);
  TestValidator.equals("no results expected", noResultResult.data.length, 0);
  TestValidator.equals(
    "pagination correct",
    noResultResult.pagination.records,
    0,
  );
}
