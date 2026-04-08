import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member search and filtering functionality with username and karma filters.
 *
 * Validates the member browsing endpoint's filtering capabilities including username partial matching, display name partial matching, and karma score range filtering. Ensures that filters work independently and can be combined effectively, with accurate pagination metadata reflecting the filtered result counts.
 *
 * 1. Retrieves all members to establish baseline data for testing.
 * 2. Tests username partial match filter with case-insensitive search using substring from existing member.
 * 3. Tests display name partial match filter similarly.
 * 4. Tests karma range filtering with karmaMin and karmaMax parameters.
 * 5. Tests combined filters (username + karma range).
 * 6. Validates pagination metadata accuracy for filtered results.
 */
export async function test_api_member_search_username_karma_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get all members to establish baseline
  const allMembers = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(allMembers);
  // 2. Test username partial match filter
  if (allMembers.data.length > 0) {
    const sampleMember = allMembers.data[0];
    const substringLength = Math.max(
      1,
      Math.floor(sampleMember.username.length / 2),
    );
    const usernameSubstring = sampleMember.username.substring(
      0,
      substringLength,
    );
    const usernameFiltered = await api.functional.redditCommunity.members.index(
      connection,
      {
        body: {
          username: usernameSubstring,
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityMember.IRequest,
      },
    );
    typia.assert(usernameFiltered);
    TestValidator.predicate("username filter returns matching members", () =>
      usernameFiltered.data.every((member) =>
        member.username.toLowerCase().includes(usernameSubstring.toLowerCase()),
      ),
    );
    TestValidator.equals(
      "username filtered count matches data length",
      usernameFiltered.pagination.records,
      usernameFiltered.data.length,
    );
    // 5. Test combined filters (username + karma range) - inside conditional to access usernameFiltered
    const combinedFiltered = await api.functional.redditCommunity.members.index(
      connection,
      {
        body: {
          username: usernameSubstring,
          karmaMin: 0,
          karmaMax: 100000,
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityMember.IRequest,
      },
    );
    typia.assert(combinedFiltered);
    TestValidator.predicate("combined filters work correctly", () =>
      combinedFiltered.data.every(
        (member) =>
          member.username
            .toLowerCase()
            .includes(usernameSubstring.toLowerCase()) &&
          member.karma >= 0 &&
          member.karma <= 100000,
      ),
    );
  }
  // 3. Test display name partial match filter
  if (allMembers.data.length > 0) {
    const sampleMember =
      allMembers.data[Math.min(1, allMembers.data.length - 1)];
    const substringLength = Math.max(
      1,
      Math.floor(sampleMember.display_name.length / 2),
    );
    const displayNameSubstring = sampleMember.display_name.substring(
      0,
      substringLength,
    );
    const displayNameFiltered =
      await api.functional.redditCommunity.members.index(connection, {
        body: {
          displayName: displayNameSubstring,
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityMember.IRequest,
      });
    typia.assert(displayNameFiltered);
    TestValidator.predicate(
      "display name filter returns matching members",
      () =>
        displayNameFiltered.data.every((member) =>
          member.display_name
            .toLowerCase()
            .includes(displayNameSubstring.toLowerCase()),
        ),
    );
  }
  // 4. Test karma range filtering (independent of existing data)
  const karmaFiltered = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        karmaMin: 0,
        karmaMax: 10000,
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(karmaFiltered);
  TestValidator.predicate("karma filter returns members within range", () =>
    karmaFiltered.data.every(
      (member) => member.karma >= 0 && member.karma <= 10000,
    ),
  );
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    () => allMembers.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () =>
      allMembers.pagination.pages >= 1 || allMembers.pagination.records === 0,
  );
  TestValidator.equals(
    "pagination records matches data length",
    allMembers.pagination.records,
    allMembers.data.length,
  );
}
