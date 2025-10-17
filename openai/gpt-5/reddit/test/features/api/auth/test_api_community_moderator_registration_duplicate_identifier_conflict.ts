import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorJoin";

/**
 * Community moderator registration enforces uniqueness on email and username.
 *
 * This test verifies that:
 *
 * 1. A user can successfully register as a community moderator candidate with
 *    valid identifiers and consent timestamps.
 * 2. A second registration attempt with the same email and username is rejected by
 *    business uniqueness rules.
 *
 * Test flow:
 *
 * - Build a valid ICommunityPlatformCommunityModeratorJoin.ICreate payload
 *   (email, username, password policy, consent timestamps).
 * - POST /auth/communityModerator/join → expect IAuthorized with token.
 * - POST /auth/communityModerator/join again with identical payload → expect an
 *   error (do not assert status code), proving uniqueness is enforced.
 */
export async function test_api_community_moderator_registration_duplicate_identifier_conflict(
  connection: api.IConnection,
) {
  // Prepare valid registration payload
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(10); // matches ^[A-Za-z0-9_]{3,20}$
  const password = `a1${RandomGenerator.alphaNumeric(10)}`; // ensures >=1 letter and >=1 digit
  const nowIso = new Date().toISOString();

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformCommunityModeratorJoin.ICreate;

  // First registration should succeed and return authorized session with token
  const authorized = await api.functional.auth.communityModerator.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorized);

  // Second registration with same identifiers must fail (uniqueness violation)
  await TestValidator.error(
    "duplicate registration using same email and username must be rejected",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: joinBody,
      });
    },
  );
}
