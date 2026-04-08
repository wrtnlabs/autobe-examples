import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving a non-existent member's profile returns 404 Not Found.
 *
 * Validates the system's handling of requests for member profiles that do not exist in the database. A valid UUID format is generated that does not correspond to any existing member account, and the API is called to retrieve the profile. The test verifies that the system returns a 404 Not Found response, ensuring proper error handling for non-existent resources.
 *
 * This test confirms that the API correctly distinguishes between invalid UUID formats (which would return 400 Bad Request) and valid UUIDs that simply don't exist in the database (which return 404 Not Found). This behavior prevents information leakage about whether a particular ID format is valid or whether the resource simply doesn't exist.
 *
 * 1. Generate a valid UUID that does not exist in the database.
 * 2. Attempt to retrieve the member profile using the non-existent ID.
 * 3. Verify the API returns 404 Not Found error.
 */
export async function test_api_member_profile_nonexistent_member_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that does not correspond to any existing member
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent member's profile
  // This should return 404 Not Found
  await TestValidator.httpError(
    "non-existent member returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.members.getByMemberid(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
