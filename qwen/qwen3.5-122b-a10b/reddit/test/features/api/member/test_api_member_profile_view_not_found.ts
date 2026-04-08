import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent member's profile returns 404 Not Found.
 *
 * Validates that when a guest user attempts to view a member profile using a UUID that does not correspond to any registered member account, the system properly returns a 404 Not Found response. This ensures proper error handling for invalid member references and prevents information leakage about whether a UUID format is valid or not.
 *
 * 1. Generate a random UUID that does not correspond to any existing member.
 * 2. Create a guest connection for the public endpoint.
 * 3. Attempt to retrieve the member profile using the non-existent UUID.
 * 4. Validate that the API returns a 404 Not Found HTTP error.
 */
export async function test_api_member_profile_view_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for public endpoint access
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that is highly unlikely to exist in the database
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Verify that requesting a non-existent member returns 404 Not Found
  await TestValidator.httpError(
    "non-existent member returns 404",
    404,
    async () => {
      await api.functional.redditLike.members.at(guestConnection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
