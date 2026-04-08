import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test empty subscription list pagination for new member.
 *
 * Validates that a newly registered member with no community subscriptions receives an empty subscription list with correct pagination metadata. The test authenticates a member via join, then queries their subscription list without creating any subscriptions first.
 *
 * 1. Member registers with unique credentials.
 * 2. Member queries subscription list without any subscriptions.
 * 3. Validates response contains empty data array.
 * 4. Validates pagination metadata shows current page 1, requested limit, records 0, pages 0.
 */
export async function test_api_subscription_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registers
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Query subscription list without any subscriptions
  const subscriptions =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptions);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", subscriptions.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    subscriptions.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    subscriptions.pagination.limit,
    20,
  );
  TestValidator.equals(
    "records count is 0",
    subscriptions.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", subscriptions.pagination.pages, 0);
}
