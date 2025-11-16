import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModeratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorProfile";

/**
 * Test the permanent erasure of a moderator's profile by a platform
 * administrator.
 *
 * Scenario:
 *
 * 1. Register a platform administrator (POST /auth/administrator/join), providing
 *    unique credentials.
 * 2. Perform the moderator profile deletion using the erase endpoint, passing
 *    random UUIDs for moderatorId and profileId (since no moderator creation
 *    exists).
 * 3. Validate the response to ensure it matches ICommunityPlatformModeratorProfile
 *    structure.
 */
export async function test_api_moderator_profile_permanent_deletion_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain admin authorization
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);

  // 2. Simulate moderator/profile UUIDs for erasure (no moderator/profile creation APIs available)
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const profileId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt profile erasure as admin
  const erasedProfile: ICommunityPlatformModeratorProfile =
    await api.functional.communityPlatform.administrator.moderators.profiles.erase(
      connection,
      {
        moderatorId,
        profileId,
      },
    );
  typia.assert(erasedProfile);
}
