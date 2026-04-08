import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test karma range filtering including negative karma values on the profiles list endpoint.
 *
 * Validates the complete karma filtering functionality for user profiles, ensuring that both minimum and maximum karma filters work correctly with negative values. This is critical for a Reddit-like platform where users can have negative karma due to downvotes exceeding upvotes.
 *
 * The test verifies that karma filters correctly handle negative values, combined range filtering, and edge cases where no profiles match the criteria. It also ensures that profiles with negative karma remain fully accessible.
 *
 * 1. Filter profiles with karma >= -100 and verify all results meet the minimum threshold.
 * 2. Filter profiles with karma <= -10 and verify all results meet the maximum threshold.
 * 3. Test combined karma range filtering (e.g., -50 to 50) to verify range constraints.
 * 4. Verify negative karma values are correctly displayed in profile responses.
 * 5. Test edge case with no matching profiles to verify empty data array handling.
 */
export async function test_api_profile_list_karma_filtering_with_negative_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test karmaMin filter with negative value (-100)
  const result1 = await api.functional.redditClone.profiles.index(connection, {
    body: {
      karmaMin: -100,
      limit: 20,
    } satisfies IRedditCloneUserProfile.IRequest,
  });
  typia.assert(result1);
  // Verify all profiles have karma >= -100
  for (const profile of result1.data) {
    TestValidator.predicate(
      `profile ${profile.id} karma >= -100`,
      profile.karma >= -100,
    );
  }
  // 2. Test karmaMax filter with negative value (-10)
  const result2 = await api.functional.redditClone.profiles.index(connection, {
    body: {
      karmaMax: -10,
      limit: 20,
    } satisfies IRedditCloneUserProfile.IRequest,
  });
  typia.assert(result2);
  // Verify all profiles have karma <= -10
  for (const profile of result2.data) {
    TestValidator.predicate(
      `profile ${profile.id} karma <= -10`,
      profile.karma <= -10,
    );
  }
  // 3. Test combined karmaMin and karmaMax filters (range: -50 to 50)
  const result3 = await api.functional.redditClone.profiles.index(connection, {
    body: {
      karmaMin: -50,
      karmaMax: 50,
      limit: 20,
    } satisfies IRedditCloneUserProfile.IRequest,
  });
  typia.assert(result3);
  // Verify all profiles have karma in range [-50, 50]
  for (const profile of result3.data) {
    TestValidator.predicate(
      `profile ${profile.id} karma in range [-50, 50]`,
      profile.karma >= -50 && profile.karma <= 50,
    );
  }
  // 4. Verify negative karma values are correctly handled
  // Check if any profiles have negative karma in the results
  const hasNegativeKarma = ArrayUtil.has(
    result3.data,
    (profile) => profile.karma < 0,
  );
  if (hasNegativeKarma) {
    const negativeProfile = result3.data.find((p) => p.karma < 0)!;
    TestValidator.predicate(
      "negative karma profile is accessible",
      negativeProfile.display_name !== undefined &&
        negativeProfile.display_name.length > 0,
    );
    TestValidator.predicate(
      "negative karma value is valid int32",
      typeof negativeProfile.karma === "number" &&
        Number.isInteger(negativeProfile.karma),
    );
  }
  // 5. Test edge case: no profiles match extreme filter criteria
  const result4 = await api.functional.redditClone.profiles.index(connection, {
    body: {
      karmaMin: 999999,
      limit: 20,
    } satisfies IRedditCloneUserProfile.IRequest,
  });
  typia.assert(result4);
  // Verify empty data array with correct pagination metadata
  TestValidator.equals("no profiles found", result4.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    result4.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", result4.pagination.pages, 0);
  TestValidator.equals(
    "pagination current is 1",
    result4.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", result4.pagination.limit, 20);
}
