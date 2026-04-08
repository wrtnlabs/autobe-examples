import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test viewing a non-existent member profile returns 404 Not Found error.
 *
 * Validates that the profile endpoint properly handles requests for member profiles that do not exist in the system. The test ensures that a valid UUID format is accepted but returns a 404 error when no corresponding member profile exists, without exposing whether the UUID format is valid or simply the member doesn't exist.
 *
 * This test validates proper error handling for missing resources and ensures consistent error responses for non-existent member profiles.
 *
 * 1. Generate a valid UUID that does not correspond to any existing member.
 * 2. Attempt to retrieve the profile using the non-existent UUID.
 * 3. Verify the endpoint returns 404 Not Found error.
 */
export async function test_api_profile_view_non_existent_member(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that does not exist in the system
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent member profile
  // Expect 404 Not Found error
  await TestValidator.httpError(
    "non-existent member profile returns 404",
    404,
    async () => {
      await api.functional.redditLike.profiles.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
