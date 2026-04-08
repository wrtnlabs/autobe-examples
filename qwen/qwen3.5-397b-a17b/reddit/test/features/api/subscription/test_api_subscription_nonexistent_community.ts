import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test subscription creation validation for non-existent community.
 *
 * Validates that the system properly rejects subscription attempts to communities that do not exist. Ensures the API returns a 404 Not Found error with appropriate error messaging when a member attempts to subscribe to a community ID that has no corresponding record in the database.
 *
 * 1. Register and authenticate a new member account with randomized credentials.
 * 2. Generate a random UUID that does not correspond to any existing community.
 * 3. Attempt to create a subscription using the non-existent community ID.
 * 4. Validate the API returns 404 Not Found error indicating the community was not found.
 */
export async function test_api_subscription_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
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
  // 2. Generate random UUID for non-existent community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to subscribe to non-existent community (should fail with 404)
  await TestValidator.httpError(
    "subscribe to non-existent community returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.member.member.subscriptions.create(
        memberConnection,
        {
          body: {
            community_id: nonExistentCommunityId,
          } satisfies IRedditCommunitySubscription.ICreate,
        },
      );
    },
  );
}
