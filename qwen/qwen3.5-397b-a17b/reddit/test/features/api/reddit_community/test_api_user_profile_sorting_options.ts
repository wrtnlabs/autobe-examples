import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfile";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default sorting (karma_score descending)
  const defaultResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default sort returns data array",
    Array.isArray(defaultResult.data),
  );
  // Verify karma_score is descending (each profile's karma <= previous)
  if (defaultResult.data.length > 1) {
    for (let i = 1; i < defaultResult.data.length; i++) {
      TestValidator.predicate(
        `karma_score descending at index ${i}`,
        defaultResult.data[i - 1].karma_score >=
          defaultResult.data[i].karma_score,
      );
    }
  }
  // Test 2: Explicit karma_score sort descending
  const karmaDescResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        sort: "karma_score",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(karmaDescResult);
  if (karmaDescResult.data.length > 1) {
    for (let i = 1; i < karmaDescResult.data.length; i++) {
      TestValidator.predicate(
        `karma_score explicit descending at index ${i}`,
        karmaDescResult.data[i - 1].karma_score >=
          karmaDescResult.data[i].karma_score,
      );
    }
  }
  // Test 3: Username sort ascending (alphabetical)
  const usernameAscResult = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        sort: "username",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(usernameAscResult);
  if (usernameAscResult.data.length > 1) {
    for (let i = 1; i < usernameAscResult.data.length; i++) {
      TestValidator.predicate(
        `username ascending at index ${i}`,
        usernameAscResult.data[i - 1].username <=
          usernameAscResult.data[i].username,
      );
    }
  }
  // Test 4: Display name sort ascending (alphabetical)
  const displayNameAscResult =
    await api.functional.redditCommunity.profiles.index(connection, {
      body: {
        sort: "display_name",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    });
  typia.assert(displayNameAscResult);
  if (displayNameAscResult.data.length > 1) {
    for (let i = 1; i < displayNameAscResult.data.length; i++) {
      TestValidator.predicate(
        `display_name ascending at index ${i}`,
        displayNameAscResult.data[i - 1].display_name <=
          displayNameAscResult.data[i].display_name,
      );
    }
  }
  // Test 5: Created at sort descending (newest first)
  // ISO 8601 dates can be compared lexicographically
  const createdAtDescResult =
    await api.functional.redditCommunity.profiles.index(connection, {
      body: {
        sort: "created_at",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    });
  typia.assert(createdAtDescResult);
  if (createdAtDescResult.data.length > 1) {
    for (let i = 1; i < createdAtDescResult.data.length; i++) {
      TestValidator.predicate(
        `created_at descending at index ${i}`,
        createdAtDescResult.data[i - 1].created_at >=
          createdAtDescResult.data[i].created_at,
      );
    }
  }
  // Test 6: Pagination maintains sorted order across pages
  const page1Result = await api.functional.redditCommunity.profiles.index(
    connection,
    {
      body: {
        sort: "karma_score",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(page1Result);
  // Only test page 2 if there are enough records
  if (
    page1Result.pagination.records > 10 &&
    page1Result.pagination.pages >= 2
  ) {
    const page2Result = await api.functional.redditCommunity.profiles.index(
      connection,
      {
        body: {
          sort: "karma_score",
          page: 2,
          limit: 10,
        } satisfies IRedditCommunityUserProfile.IRequest,
      },
    );
    typia.assert(page2Result);
    // Verify page 2's first item has karma <= page 1's last item
    if (page1Result.data.length > 0 && page2Result.data.length > 0) {
      TestValidator.predicate(
        "pagination maintains karma_score order across pages",
        page1Result.data[page1Result.data.length - 1].karma_score >=
          page2Result.data[0].karma_score,
      );
    }
  }
}
