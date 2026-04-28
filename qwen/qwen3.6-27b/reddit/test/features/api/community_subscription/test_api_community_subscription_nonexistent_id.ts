import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a community subscription with a nonexistent UUID returns 404 Not Found.
 *
 * An authenticated member attempts to fetch a subscription record using a valid UUID format
 * that doesn't correspond to any existing subscription in the database. This verifies that the
 * system returns a proper 404 response rather than a 400 validation error or 500 server error,
 * confirming that UUID format validation passes but resource lookup gracefully handles missing records.
 *
 * 1. Register and authenticate a new member using the join utility.
 * 2. Generate a random UUID that is guaranteed to not exist in the database.
 * 3. Attempt to retrieve the subscription using the nonexistent UUID.
 * 4. Verify the system returns a 404 Not Found response.
 */
export async function test_api_community_subscription_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Generate a random UUID that won't exist
  const nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt to retrieve and verify 404 response
  await TestValidator.httpError("subscription not found", 404, async () => {
    await api.functional.redditLikeCommunity.member.community_subscriptions.at(
      memberConnection,
      { subscriptionId: nonexistentId },
    );
  });
}
