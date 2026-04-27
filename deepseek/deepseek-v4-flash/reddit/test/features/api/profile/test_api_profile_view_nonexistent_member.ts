import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a profile for a non-existent member UUID returns 404 Not Found.
 *
 * The profile endpoint should gracefully handle requests for member IDs that do not correspond to any active profile. The specification defines two scenarios that produce a 404: the member does not exist at all, or the member's account has been soft-deleted. This test covers the first case by using a randomly generated UUID that has never been registered.
 *
 * 1. Generate a random UUID that does not correspond to any existing member.
 * 2. Call GET /communityPlatform/profiles/{memberId} with this UUID.
 * 3. Verify that the API returns a 404 HTTP status code.
 */
export async function test_api_profile_view_nonexistent_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random UUID (extremely unlikely to exist)
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. & 3. Call the profile endpoint and expect 404 Not Found
  await TestValidator.httpError("non-existent member returns 404", 404, () =>
    api.functional.communityPlatform.profiles.at(connection, {
      memberId: nonExistentMemberId,
    }),
  );
}
