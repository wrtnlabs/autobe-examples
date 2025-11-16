import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformAdministratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorProfile";

/**
 * Validates that an authenticated administrator can retrieve their own
 * administrator platform profile and that unauthorized or invalid access is
 * prevented.
 *
 * 1. Register a new administrator.
 * 2. Retrieve the corresponding administrator profile using authenticated context
 *    and the correct IDs.
 * 3. Assert all profile fields (display_username, avatar_uri, bio, status,
 *    created_at, updated_at) are present and correspond to the newly created
 *    account.
 * 4. Ensure fetching the profile with missing or incorrect authentication fails.
 * 5. (Forcibly) Simulate soft-deletion or status retirement and confirm the
 *    profile cannot be retrieved afterwards.
 */
export async function test_api_administrator_profile_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminRegistration = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminRegistration);

  // 2. Profile retrieval (authenticated)
  const profile =
    await api.functional.communityPlatform.administrator.administrators.profiles.at(
      connection,
      {
        administratorId: adminRegistration.id,
        profileId: adminRegistration.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(profile);
  TestValidator.equals(
    "profile belongs to administrator",
    profile.community_platform_administrator_id,
    adminRegistration.id,
  );
  TestValidator.predicate(
    "display_username present",
    typeof profile.display_username === "string" &&
      profile.display_username.length > 0,
  );
  TestValidator.equals(
    "profile status present",
    typeof profile.status,
    "string",
  );
  TestValidator.predicate(
    "created_at present",
    typeof profile.created_at === "string" && profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof profile.updated_at === "string" && profile.updated_at.length > 0,
  );

  // 3. Unauthenticated fetch attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Forbidden if not authenticated", async () => {
    await api.functional.communityPlatform.administrator.administrators.profiles.at(
      unauthConn,
      {
        administratorId: adminRegistration.id,
        profileId: adminRegistration.id as string & tags.Format<"uuid">,
      },
    );
  });

  // 4. Retired/soft-deleted simulation: As there's no API to retire/delete, skip step (would be direct DB manipulation or API not provided).
}
