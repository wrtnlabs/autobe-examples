import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_subscription_deletion_with_invalid_community_id(
  connection: api.IConnection,
) {
  // Register a member for testing
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "ValidPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Generate a non-existent community ID
  const invalidCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Generate a valid subscription ID (even though it won't exist for this community)
  const subscriptionId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete subscription with invalid community ID - should fail
  await TestValidator.error(
    "deletion with invalid community ID should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.subscriptions.erase(
        connection,
        {
          communityId: invalidCommunityId,
          subscriptionId: subscriptionId,
        },
      );
    },
  );
}
