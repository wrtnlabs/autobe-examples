import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
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
 * Test the edge case where a member has no subscriptions and retrieves an empty subscribed communities list.
 *
 * This validates the system correctly handles users who haven't subscribed to any communities yet.
 *
 * Test Flow:
 * 1. Register a new member account (this member will have no subscriptions by default)
 * 2. Call the subscribed communities endpoint with pagination parameters
 * 3. Validate that the response returns an empty data array
 * 4. Validate pagination metadata is correctly structured (current page 1, limit from request, records count 0, pages count 0)
 * 5. Ensure the endpoint doesn't fail or return errors when no subscriptions exist
 *
 * This scenario is important for new users who just registered but haven't subscribed to any communities yet.
 */
export async function test_api_subscribed_communities_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (will have no subscriptions by default)
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
  // 2. Call subscribed communities endpoint with pagination parameters
  const response: IPageIRedditCloneCommunity.ISummary =
    await api.functional.redditClone.member.subscribed.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at_desc",
      } satisfies IRedditCloneSubscription.IRequest,
    });
  typia.assert(response);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", response.data, []);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit matches request", response.pagination.limit, 20);
  TestValidator.equals("records count is 0", response.pagination.records, 0);
  TestValidator.equals("pages count is 0", response.pagination.pages, 0);
}
