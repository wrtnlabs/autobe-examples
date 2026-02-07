import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_search_with_no_matches(
  connection: api.IConnection,
): Promise<void> {
  // Search with unique username containing special characters unlikely to exist
  const result1 = await api.functional.redditPlatform.users.index(connection, {
    body: {
      username: "this-username-does-not-exist-12345",
    } satisfies IRedditPlatformUser.IRequest,
  });
  typia.assert(result1);
  // Validate pagination for empty search results
  TestValidator.equals(
    "pagination reflects zero results",
    result1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", result1.pagination.limit, 10);
  TestValidator.equals("zero matching records", result1.pagination.records, 0);
  TestValidator.equals(
    "zero pages when no results",
    result1.pagination.pages,
    0,
  );
  TestValidator.equals("empty data array", result1.data.length, 0);
  // Search with bio phrase that no user possesses
  const result2 = await api.functional.redditPlatform.users.index(connection, {
    body: {
      bio: "this bio phrase absolutely does not exist in any user",
    } satisfies IRedditPlatformUser.IRequest,
  });
  typia.assert(result2);
  // Validate empty results
  TestValidator.equals(
    "zero records for bio search",
    result2.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty data array for bio search",
    result2.data.length,
    0,
  );
  // Search with karma range far beyond realistic user scores
  const result3 = await api.functional.redditPlatform.users.index(connection, {
    body: {
      karmaMin: 1000000, // 1 million karma - unrealistic for any user
      karmaMax: 10000000, // 10 million karma
    } satisfies IRedditPlatformUser.IRequest,
  });
  typia.assert(result3);
  // Validate no users in extreme karma range
  TestValidator.equals(
    "zero records for extreme karma search",
    result3.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty data array for karma search",
    result3.data.length,
    0,
  );
  // Combined search with multiple filters guaranteed to return nothing
  const result4 = await api.functional.redditPlatform.users.index(connection, {
    body: {
      username: "unique-user-xyz-999",
      bio: "completely unique bio phrase",
      karmaMin: 500000,
      karmaMax: 600000,
    } satisfies IRedditPlatformUser.IRequest,
  });
  typia.assert(result4);
  // Validate combined search returns empty
  TestValidator.equals(
    "zero records for combined search",
    result4.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty data array for combined search",
    result4.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    result4.pagination.current,
    1,
  );
  TestValidator.equals("pagination pages is 0", result4.pagination.pages, 0);
}
