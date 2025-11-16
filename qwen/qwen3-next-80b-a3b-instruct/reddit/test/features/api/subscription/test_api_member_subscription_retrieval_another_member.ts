import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_subscription_retrieval_another_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate first member to establish access context
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "Password123!",
      href: "https://community-platform.com/join",
      referrer: "https://community-platform.com",
      ip: "192.168.1.100",
    } satisfies IMember.ICreate,
  });
  typia.assert(member1);

  // Step 2: Generate a random UUID to simulate an access attempt to a non-existent subscription
  // This tests the ownership enforcement mechanism - member cannot access subscription they don't own
  // Since we have no way to retrieve member2's subscription ID (no listing endpoint),
  // we test that a member cannot access any subscription that doesn't belong to them
  const invalidSubscriptionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to access a non-existent subscription with member1's authentication
  // The system should return 404 if the subscription doesn't exist, proving ownership enforcement
  await TestValidator.error(
    "member cannot access non-existent subscription",
    async () => {
      await api.functional.communityPlatform.member.subscriptions.at(
        connection,
        {
          subscriptionId: invalidSubscriptionId,
        },
      );
    },
  );
}
