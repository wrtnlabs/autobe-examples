import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_joining_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user for the test
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: userEmail,
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate a non-existent community name
  const nonExistentCommunityName = `nonexistent-${RandomGenerator.alphaNumeric(8)}`;

  // Step 3: Attempt to join the non-existent community and expect an error
  await TestValidator.error(
    "joining non-existent community should fail",
    async () => {
      await api.functional.redditPlatform.communities.join(connection, {
        communityName: nonExistentCommunityName,
      });
    },
  );
}
