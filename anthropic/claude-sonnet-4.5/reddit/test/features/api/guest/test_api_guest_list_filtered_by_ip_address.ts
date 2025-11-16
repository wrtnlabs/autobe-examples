import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering guest visitors by specific IP address.
 *
 * This test verifies that moderators can filter the guest list to find visitors
 * from a particular IP address, which is useful for investigating traffic from
 * specific sources or tracking suspicious activity.
 *
 * Process:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate a test IP address for filtering
 * 3. Request guest records filtered by the specific IP address
 * 4. Validate the paginated response structure
 * 5. Verify that pagination metadata is correct
 */
export async function test_api_guest_list_filtered_by_ip_address(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a test IP address for filtering
  const octet1 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
  >();
  const octet2 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
  >();
  const octet3 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
  >();
  const octet4 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
  >();
  const testIpAddress = `${octet1}.${octet2}.${octet3}.${octet4}`;

  // Step 3: Request guest records filtered by the specific IP address
  const guestListResponse: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.moderator.guests.index(connection, {
      body: {
        ip_address: testIpAddress,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityGuest.IRequest,
    });
  typia.assert(guestListResponse);

  // Step 4: Validate the paginated response structure
  TestValidator.predicate(
    "response should have pagination metadata",
    guestListResponse.pagination !== null &&
      guestListResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(guestListResponse.data),
  );

  // Step 5: Verify that pagination metadata is correct
  TestValidator.equals(
    "current page should be 0 for page 1 request",
    guestListResponse.pagination.current,
    0,
  );
  TestValidator.equals(
    "limit should be 10",
    guestListResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    guestListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    guestListResponse.pagination.pages >= 0,
  );
}
