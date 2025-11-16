import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate delete behavior for community moderators via platformAdmin API.
 *
 * Business goals:
 *
 * - Ensure a community moderator created through the public join endpoint can be
 *   deleted by a platform administrator using the
 *   /communityPlatform/platformAdmin/communityModerators/{communityModeratorId}
 *   erase endpoint.
 * - Verify that the first DELETE call succeeds when the moderator exists.
 * - Verify that subsequent access and deletion attempts on the same ID fail,
 *   modeling a "hard delete with not-found on second call" contract, rather
 *   than a silently idempotent delete.
 *
 * Scenario steps:
 *
 * 1. Register a community moderator via /auth/communityModerator/join.
 * 2. Register a platform admin via /auth/platformAdmin/join to obtain an
 *    administrator Authorization token in the same connection.
 * 3. As platformAdmin, GET the moderator via
 *    /communityPlatform/platformAdmin/communityModerators/{communityModeratorId}
 *    and confirm it exists.
 * 4. Perform DELETE once on the moderator ID; expect success (no error).
 * 5. Try to GET the same moderator again; expect an error (not-found semantics).
 * 6. Try to DELETE the same moderator ID again; expect an error, confirming that
 *    delete does not silently succeed for already-removed moderators.
 */
export async function test_api_community_moderator_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Register a community moderator (public join, becomes authenticated as moderator)
  const moderatorJoinBody =
    typia.random<ICommunityPlatformCommunityModerator.IJoin>();
  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 2. Register a platform administrator and switch Authorization to platformAdmin
  const adminJoinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 3. Confirm moderator exists via platformAdmin GET
  const beforeDeleteSummary: ICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.at(
      connection,
      {
        communityModeratorId: moderatorAuthorized.id,
      },
    );
  typia.assert<ICommunityPlatformCommunityModerator.ISummary>(
    beforeDeleteSummary,
  );
  TestValidator.equals(
    "moderator summary id should match authorized id",
    beforeDeleteSummary.id,
    moderatorAuthorized.id,
  );

  // 4. First delete should succeed without throwing
  await api.functional.communityPlatform.platformAdmin.communityModerators.erase(
    connection,
    {
      communityModeratorId: moderatorAuthorized.id,
    },
  );

  // 5. GET after deletion must fail (not-found semantics)
  await TestValidator.error("get after delete must fail", async () => {
    await api.functional.communityPlatform.platformAdmin.communityModerators.at(
      connection,
      {
        communityModeratorId: moderatorAuthorized.id,
      },
    );
  });

  // 6. Second delete on same ID must also fail
  await TestValidator.error("second delete on same id must fail", async () => {
    await api.functional.communityPlatform.platformAdmin.communityModerators.erase(
      connection,
      {
        communityModeratorId: moderatorAuthorized.id,
      },
    );
  });
}
