import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent member profile returns a 404 Not Found error.
 *
 * This test validates proper error handling when requesting a member profile
 * that does not exist in the system. It generates a random UUID that statistically
 * won't match any existing member and verifies the API returns HTTP 404.
 */
export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any existing member
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Verify that requesting this non-existent member returns HTTP 404
  await TestValidator.httpError(
    "should return 404 for non-existent member",
    404,
    async () => {
      await api.functional.communityPlatform.members.at(connection, {
        memberId: nonExistentId,
      });
    },
  );
}
