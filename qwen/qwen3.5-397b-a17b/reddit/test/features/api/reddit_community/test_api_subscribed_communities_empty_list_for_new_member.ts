import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a newly registered member with no subscriptions receives an empty list.
 *
 * Validates the baseline state for newly registered member accounts by confirming that the subscribed-communities endpoint returns an empty list with proper pagination metadata. This ensures the system correctly handles the zero-subscription case without errors.
 *
 * The test verifies that new members start with no community subscriptions and that the pagination structure remains valid even when there are no results to return. This is critical for frontend components that rely on consistent response structures.
 *
 * 1. Register a new member account with randomized credentials using authorize_member_join utility.
 * 2. Create a member-specific connection with the authentication token from the join response.
 * 3. Call the subscribed-communities endpoint with default pagination parameters.
 * 4. Validate the response structure using typia.assert().
 * 5. Verify the data array is empty (length === 0).
 * 6. Verify pagination metadata shows zero records and zero pages.
 * 7. Verify pagination shows current page as 1 (default first page).
 */
export async function test_api_subscribed_communities_empty_list_for_new_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Call subscribed-communities endpoint with default pagination
  const response =
    await api.functional.redditCommunity.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(response);
  // 4. Verify empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 5. Verify pagination metadata
  TestValidator.equals("zero records", response.pagination.records, 0);
  TestValidator.equals("zero pages", response.pagination.pages, 0);
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
}
