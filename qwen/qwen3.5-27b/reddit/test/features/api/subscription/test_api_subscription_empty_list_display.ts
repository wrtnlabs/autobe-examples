import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunitySubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that empty subscription list displays correctly with proper pagination metadata.
 *
 * Validates that when a newly registered member has no community subscriptions, the system returns an empty paginated list with zero total count and appropriate pagination metadata. Ensures the empty state is handled gracefully without errors.
 *
 * 1. Register a new member account with email, password, and username
 * 2. The new member has no subscriptions by default
 * 3. Retrieve the member's subscription list
 * 4. Validate the response contains empty data array and zero pagination counts
 * 5. Verify pagination metadata structure is correct
 */
export async function test_api_subscription_empty_list_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
      username: RandomGenerator.name(1),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Retrieve subscription list (should be empty)
  const subscriptions =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptions);
  // 3. Validate empty subscription list
  TestValidator.equals("data array is empty", subscriptions.data.length, 0);
  TestValidator.equals(
    "total records is zero",
    subscriptions.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages is zero",
    subscriptions.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "current page is valid",
    subscriptions.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", subscriptions.pagination.limit > 0);
}
