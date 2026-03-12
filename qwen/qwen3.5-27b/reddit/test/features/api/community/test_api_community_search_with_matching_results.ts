import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that searching for communities by name returns matching results with proper pagination.
 *
 * Test Steps:
 * 1. Authenticate as guest user
 * 2. Search for communities with a specific search term
 * 3. Verify the response contains a paginated list of communities
 * 4. Verify all returned communities have names containing the search term (case-insensitive partial match)
 * 5. Verify each community summary includes: id, name, description, icon, subscriber_count, created_at, and owner information
 * 6. Verify pagination metadata is correct (current page, limit, total records, total pages)
 */
export async function test_api_community_search_with_matching_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Search for communities with a specific search term
  const searchTerm = RandomGenerator.alphabets(5);
  const searchRequest = {
    search: searchTerm,
    page: 1,
    pageSize: 20,
  } satisfies IRedditCloneCommunity.IRequest;
  const searchResult =
    await api.functional.redditClone.guest.communities.search.index(
      guestConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Verify pagination metadata
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("page size is 20", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "has valid total records",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid total pages",
    searchResult.pagination.pages >= 0,
  );
  // 4. Verify each community in results
  await ArrayUtil.asyncForEach(searchResult.data, async (community, index) => {
    // Validate community structure
    typia.assert(community);
    // Verify required fields exist
    TestValidator.predicate(
      `community ${index} has valid id`,
      community.id !== undefined,
    );
    TestValidator.predicate(
      `community ${index} has name`,
      community.name !== undefined && community.name.length > 0,
    );
    TestValidator.predicate(
      `community ${index} has valid subscriber count`,
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      `community ${index} has created_at`,
      community.created_at !== undefined,
    );
    TestValidator.predicate(
      `community ${index} has owner`,
      community.owner !== undefined,
    );
    // Verify owner structure
    typia.assert(community.owner);
    TestValidator.predicate(
      `community ${index} owner has username`,
      community.owner.username !== undefined,
    );
    TestValidator.predicate(
      `community ${index} owner has display_name`,
      community.owner.display_name !== undefined,
    );
    TestValidator.predicate(
      `community ${index} owner has valid karma`,
      community.owner.karma >= 0,
    );
    // Verify optional fields can be null
    if (community.description !== null) {
      TestValidator.predicate(
        `community ${index} description length valid`,
        community.description.length <= 500,
      );
    }
    if (community.icon !== null) {
      TestValidator.predicate(
        `community ${index} icon is valid URI`,
        community.icon.length <= 80000,
      );
    }
  });
  // 5. Verify pagination consistency
  TestValidator.equals(
    "data length matches limit or records",
    searchResult.data.length,
    Math.min(searchResult.pagination.limit, searchResult.pagination.records),
  );
  // 6. Test pagination with different page
  const page2Request = {
    search: searchTerm,
    page: 2,
    pageSize: 20,
  } satisfies IRedditCloneCommunity.IRequest;
  const page2Result =
    await api.functional.redditClone.guest.communities.search.index(
      guestConnection,
      {
        body: page2Request,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 20", page2Result.pagination.limit, 20);
  // 7. Test with different page size
  const customPageSizeRequest = {
    search: searchTerm,
    page: 1,
    pageSize: 50,
  } satisfies IRedditCloneCommunity.IRequest;
  const customPageSizeResult =
    await api.functional.redditClone.guest.communities.search.index(
      guestConnection,
      {
        body: customPageSizeRequest,
      },
    );
  typia.assert(customPageSizeResult);
  TestValidator.equals(
    "custom page size is 50",
    customPageSizeResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "custom page size data length valid",
    customPageSizeResult.data.length <= 50,
  );
}
