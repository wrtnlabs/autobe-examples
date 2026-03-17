import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the edge case where a member has no community subscriptions.
 *
 * This test validates the empty state handling of the subscriptions list endpoint:
 * 1. Member joins the platform but does not subscribe to any communities
 * 2. When calling the subscriptions list endpoint, verify:
 *    - Response returns an empty data array
 *    - Pagination metadata shows records: 0, pages: 0, current: 1
 *    - Response structure is valid with pagination and data fields present
 *    - No errors are thrown for empty result set
 *
 * This ensures graceful handling of the empty subscriptions state.
 */
export async function test_api_subscription_list_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Call subscriptions list endpoint (member has no subscriptions)
  const response = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at_desc",
      } satisfies IRedditCloneSubscription.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(response);
  // 4. Validate empty data array
  TestValidator.equals("data array is empty", response.data, []);
  // 5. Validate pagination metadata for empty state
  TestValidator.equals("records count", response.pagination.records, 0);
  TestValidator.equals("pages count", response.pagination.pages, 0);
  TestValidator.equals("current page", response.pagination.current, 1);
}