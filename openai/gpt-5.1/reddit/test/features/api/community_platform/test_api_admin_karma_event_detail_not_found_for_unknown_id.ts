import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaEvent";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate 404 Not Found when requesting a non-existent karma event detail as
 * adminUser.
 *
 * Business purpose
 *
 * - Ensure that the admin-facing karma event detail endpoint does not falsely
 *   return success when a client queries an unknown karmaEventId.
 * - Confirm that the backend returns a proper 404 HttpError for non-existent
 *   karma events, even when the adminUser is fully authenticated and the
 *   request path and UUID format are valid.
 *
 * High-level flow
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join.
 *
 *    - This creates an administrative account in community_platform_adminusers.
 *    - The SDK also sets Authorization header on the IConnection using the returned
 *         token so that subsequent adminUser calls are authenticated.
 * 2. Generate a random UUID to act as a non-existent karmaEventId.
 *
 *    - We do not create any karma events in this test, so any random UUID is
 *         effectively unknown to the system.
 * 3. As the authenticated adminUser, call GET
 *    /communityPlatform/adminUser/karmaEvents/{karmaEventId} via
 *    api.functional.communityPlatform.adminUser.karmaEvents.at, passing the
 *    random UUID as karmaEventId.
 * 4. Assert that the call fails with an HttpError whose status code is 404 using
 *    TestValidator.httpError.
 *
 *    - This verifies correct not-found behavior for unknown IDs.
 *    - We do not inspect the error body beyond the status code, in line with E2E
 *         testing guidelines that avoid over-specifying error payloads.
 */
export async function test_api_admin_karma_event_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser to obtain an authenticated admin context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-" + RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Generate a random UUID that should not correspond to any existing karma event.
  const unknownKarmaEventId = typia.random<string & tags.Format<"uuid">>();

  // 3. As authenticated adminUser, attempt to fetch karma event detail by unknown ID.
  //    Expectation: HttpError with 404 Not Found status.
  await TestValidator.httpError(
    "requesting unknown karmaEventId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.karmaEvents.at(
        connection,
        {
          karmaEventId: unknownKarmaEventId,
        },
      );
    },
  );
}
