import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test subscription list endpoint returns empty array when member has no subscriptions.
 *
 * Validates the edge case where an authenticated member queries their subscription list immediately after registration, before subscribing to any communities. Ensures the endpoint handles the zero-subscription state gracefully by returning an empty data array with valid pagination metadata.
 *
 * This test is critical for verifying that the pagination structure remains consistent regardless of data volume, and that the system doesn't error when querying empty result sets. The pagination metadata should correctly reflect zero records and zero pages while maintaining the requested page position.
 *
 * 1. Register and authenticate a new member using authorize_member_join utility.
 * 2. Create member-specific connection with authentication token.
 * 3. Call subscription list endpoint without any prior subscriptions.
 * 4. Validate response structure and empty data array.
 * 5. Assert pagination metadata reflects zero subscriptions correctly.
 */
export async function test_api_subscription_list_empty_when_no_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Call subscription list endpoint (no subscriptions exist yet)
  const result =
    await api.functional.redditCommunity.member.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", result.data.length, 0);
  // 4. Validate pagination metadata for zero subscriptions
  TestValidator.equals("records count", result.pagination.records, 0);
  TestValidator.equals("pages count", result.pagination.pages, 0);
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.predicate(
    "limit has positive value",
    result.pagination.limit > 0,
  );
}
