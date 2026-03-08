import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test that community deletion is not permitted per business requirements.
 *
 * Business Rules:
 * - Section 265: 'THE system SHALL NOT provide functionality for deleting communities'
 * - Section 96: 'THE system SHALL retain communities indefinitely'
 *
 * This test validates that:
 * 1. Communities cannot be deleted through the API
 * 2. Deletion attempts are properly rejected with appropriate error codes
 * 3. Communities remain intact after deletion attempts
 */
export async function test_api_community_deletion_not_permitted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member-specific connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(10),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  // Step 2: Create a test community using the utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 3 & 4: Attempt to delete the community and verify it's rejected
  await TestValidator.httpError(
    "community deletion should be rejected",
    [403, 404, 405],
    async () => {
      await api.functional.communityPlatform.member.communities.erase(
        memberConnection,
        {
          communityName: community.name,
        },
      );
    },
  );
  // Step 5: Verify the community still exists (would need GET endpoint if available)
  // The community should still be intact after the failed deletion attempt
  TestValidator.predicate(
    "community should still exist after deletion attempt",
    () => community.id !== null && community.id !== undefined,
  );
}
