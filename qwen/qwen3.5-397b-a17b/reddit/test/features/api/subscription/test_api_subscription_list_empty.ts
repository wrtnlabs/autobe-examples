import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
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
 * Test subscription list endpoint when member has no subscriptions.
 *
 * This test validates the edge case where an authenticated member has not
 * subscribed to any communities yet. The test verifies:
 * 1. Member can successfully authenticate via join
 * 2. Subscription list returns empty data array
 * 3. Pagination metadata is correct for empty state (records: 0, pages: 0, current: 1, limit: 20)
 * 4. Response structure is valid even with no subscriptions
 */
export async function test_api_subscription_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (but don't subscribe to any communities)
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
  // 2. Get subscription list (should be empty)
  const subscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptions);
  // 3. Validate empty state
  TestValidator.equals("data array is empty", subscriptions.data.length, 0);
  TestValidator.equals("records count", subscriptions.pagination.records, 0);
  TestValidator.equals("pages count", subscriptions.pagination.pages, 0);
  TestValidator.equals("current page", subscriptions.pagination.current, 1);
  TestValidator.equals("limit", subscriptions.pagination.limit, 20);
}
