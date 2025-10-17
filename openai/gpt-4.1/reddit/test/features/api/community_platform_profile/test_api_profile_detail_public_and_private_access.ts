import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";

/**
 * Validate moderator access to both public and private profiles.
 *
 * - Register a moderator with random data for permissions.
 * - Simulate a random public ICommunityPlatformProfile (is_public: true).
 * - Fetch the public profile by id and assert structure and is_public flag.
 * - Simulate a random private ICommunityPlatformProfile (is_public: false).
 * - Fetch the private profile as a moderator and assert structure and is_public
 *   flag.
 * - Attempt to access a non-existent profileId (random uuid) and assert proper
 *   error is thrown.
 */
export async function test_api_profile_detail_public_and_private_access(
  connection: api.IConnection,
) {
  // 1. Register a moderator for permissioned access
  const moderatorInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    community_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorInput,
    });
  typia.assert(moderator);

  // 2. Simulate a public profile (is_public: true)
  const publicProfile: ICommunityPlatformProfile = {
    ...typia.random<ICommunityPlatformProfile>(),
    is_public: true,
  };
  // 3. Fetch profile - structure and is_public field
  const fetchedPublic = await api.functional.communityPlatform.profiles.at(
    connection,
    { profileId: publicProfile.id },
  );
  typia.assert(fetchedPublic);
  TestValidator.equals(
    "Fetched public profile is_public field is true",
    fetchedPublic.is_public,
    true,
  );

  // 4. Simulate a private profile (is_public: false)
  const privateProfile: ICommunityPlatformProfile = {
    ...typia.random<ICommunityPlatformProfile>(),
    is_public: false,
  };
  // 5. Fetch private profile - structure and is_public field
  const fetchedPrivate = await api.functional.communityPlatform.profiles.at(
    connection,
    { profileId: privateProfile.id },
  );
  typia.assert(fetchedPrivate);
  TestValidator.equals(
    "Fetched private profile is_public field is false",
    fetchedPrivate.is_public,
    false,
  );

  // 6. Fetch a non-existent profile, should error
  await TestValidator.error(
    "Non-existent profileId returns error",
    async () => {
      // random uuid not matching any real profile
      await api.functional.communityPlatform.profiles.at(connection, {
        profileId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
