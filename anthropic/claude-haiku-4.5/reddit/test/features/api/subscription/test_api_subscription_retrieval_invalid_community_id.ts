import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_subscription_retrieval_invalid_community_id(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAccount = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAccount);

  // Step 2: Attempt to retrieve a subscription with invalid community ID
  const invalidCommunityId = typia.random<string & tags.Format<"uuid">>();
  const subscriptionId = typia.random<string & tags.Format<"uuid">>();

  // The API should return an error when trying to access a non-existent community
  await TestValidator.error(
    "should fail when retrieving subscription with invalid community ID",
    async () => {
      await api.functional.communityPlatform.member.communities.subscriptions.at(
        connection,
        {
          communityId: invalidCommunityId,
          subscriptionId: subscriptionId,
        },
      );
    },
  );
}
