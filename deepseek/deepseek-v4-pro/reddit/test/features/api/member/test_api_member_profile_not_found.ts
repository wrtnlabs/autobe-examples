import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a member profile with a non-existent username returns a 404 error.
 *
 * Validates the error handling for missing resources by calling the public member profile endpoint with a username guaranteed not to exist on the platform. A random UUID-based string is used as the username to ensure it cannot match any real account.
 *
 * 1. Generate a random non-existent username using a UUID string.
 * 2. Attempt to retrieve the profile for the non-existent username.
 * 3. Verify the API returns a 404 Not Found error.
 */
export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  const nonExistentUsername = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent member profile returns 404",
    404,
    () =>
      api.functional.communityHub.members.at(connection, {
        username: nonExistentUsername,
      }),
  );
}
