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

export async function test_api_member_profile_sort_by_karma_score(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default sort (karma_score descending) - no sort parameter specified
  const defaultResult = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(defaultResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    defaultResult.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", defaultResult.pagination.limit === 20);
  TestValidator.predicate(
    "records is non-negative",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultResult.pagination.pages >= 0,
  );
  // Validate pages calculation matches records/limit
  const expectedPages =
    defaultResult.pagination.records === 0
      ? 0
      : Math.ceil(
          defaultResult.pagination.records / defaultResult.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation matches records/limit",
    defaultResult.pagination.pages,
    expectedPages,
  );
  // Validate default sort order (karma_score descending)
  if (defaultResult.data.length > 1) {
    for (let i = 0; i < defaultResult.data.length - 1; i++) {
      TestValidator.predicate(
        `default sort: item ${i} karma >= item ${i + 1} karma`,
        defaultResult.data[i].karma_score >=
          defaultResult.data[i + 1].karma_score,
      );
    }
  }
  // Test 2: Sort by karma_score descending (explicit)
  const karmaDescResult = await api.functional.redditCommunity.members.index(
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
  // Validate karma_score descending order
  if (karmaDescResult.data.length > 1) {
    for (let i = 0; i < karmaDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        `karma_desc: item ${i} karma >= item ${i + 1} karma`,
        karmaDescResult.data[i].karma_score >=
          karmaDescResult.data[i + 1].karma_score,
      );
    }
  }
  // Test 3: Sort by username ascending (alphabetical)
  const usernameResult = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "username",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(usernameResult);
  // Validate username ascending order (alphabetical)
  if (usernameResult.data.length > 1) {
    for (let i = 0; i < usernameResult.data.length - 1; i++) {
      TestValidator.predicate(
        `username sort: item ${i} <= item ${i + 1}`,
        usernameResult.data[i].username.localeCompare(
          usernameResult.data[i + 1].username,
        ) <= 0,
      );
    }
  }
  // Test 4: Sort by display_name ascending
  const displayNameResult = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "display_name",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(displayNameResult);
  // Validate display_name ascending order
  if (displayNameResult.data.length > 1) {
    for (let i = 0; i < displayNameResult.data.length - 1; i++) {
      TestValidator.predicate(
        `display_name sort: item ${i} <= item ${i + 1}`,
        displayNameResult.data[i].display_name.localeCompare(
          displayNameResult.data[i + 1].display_name,
        ) <= 0,
      );
    }
  }
  // Test 5: Sort by created_at descending (newest first)
  const createdAtResult = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "created_at",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(createdAtResult);
  // Validate created_at descending order (newest first)
  if (createdAtResult.data.length > 1) {
    for (let i = 0; i < createdAtResult.data.length - 1; i++) {
      TestValidator.predicate(
        `created_at sort: item ${i} >= item ${i + 1}`,
        new Date(createdAtResult.data[i].created_at).getTime() >=
          new Date(createdAtResult.data[i + 1].created_at).getTime(),
      );
    }
  }
  // Test 6: Pagination - get page 2
  const page2Result = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.predicate(
    "page 2 current is 2",
    page2Result.pagination.current === 2,
  );
  TestValidator.predicate(
    "page 2 limit is 10",
    page2Result.pagination.limit === 10,
  );
  // Test 7: Search functionality with sort
  const searchResult = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        search: "test",
        sort: "karma_score",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate search results are sorted by karma_score
  if (searchResult.data.length > 1) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      TestValidator.predicate(
        `search + sort: item ${i} karma >= item ${i + 1} karma`,
        searchResult.data[i].karma_score >=
          searchResult.data[i + 1].karma_score,
      );
    }
  }
  // Test 8: Karma range filter with sort
  const karmaFilterResult = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        karmaMin: 0,
        karmaMax: 10000,
        sort: "karma_score",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    },
  );
  typia.assert(karmaFilterResult);
  // Validate all results are within karma range
  for (const profile of karmaFilterResult.data) {
    TestValidator.predicate(
      `karma >= 0 for ${profile.username}`,
      profile.karma_score >= 0,
    );
    TestValidator.predicate(
      `karma <= 10000 for ${profile.username}`,
      profile.karma_score <= 10000,
    );
  }
  // Test 9: Validate response structure - check required fields exist
  for (const profile of defaultResult.data) {
    TestValidator.predicate(
      "profile has non-empty username",
      profile.username.length > 0,
    );
    TestValidator.predicate(
      "profile has non-empty display_name",
      profile.display_name.length > 0,
    );
    // Bio is optional (can be null or undefined), so just check it's the right type if present
    if (profile.bio !== undefined && profile.bio !== null) {
      TestValidator.predicate(
        "profile bio is string",
        typeof profile.bio === "string",
      );
    }
  }
}
