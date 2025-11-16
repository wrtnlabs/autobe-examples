import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test subscription with non-existent community ID.
 *
 * Validates that attempting to subscribe to a community with an invalid or
 * non-existent community ID properly returns an error. This ensures the API
 * validates community existence before creating subscription records.
 *
 * Workflow:
 *
 * 1. Create a member account through authentication
 * 2. Attempt to subscribe using a non-existent community ID
 * 3. Verify that the operation fails with an appropriate error
 * 4. Confirm proper error handling for invalid community references
 */
export async function test_api_community_subscription_invalid_community_id(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePass123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);
  TestValidator.equals(
    "member account created",
    typeof authorizedMember.id,
    "string",
  );

  // Step 2: Attempt to subscribe to a non-existent community
  const invalidCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "subscription with invalid community ID should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.subscriptions.create(
        connection,
        {
          communityId: invalidCommunityId,
          body: {
            community_id: invalidCommunityId,
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    },
  );
}
