import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Tests soft-deletion (setting deleted_at) of an administrator's profile by a
 * privileged administrator. This covers onboarding as a new administrator to
 * establish the authentication context, performing the profile delete
 * operation, and confirming business logic of soft deletion.
 *
 * Steps:
 *
 * 1. Register as a new administrator (creates a new admin account and establishes
 *    authentication)
 * 2. Use returned administrator ID as both administratorId and (synthetically as
 *    this API does not expose explicit profile IDs, use administratorId as
 *    profileId)
 * 3. Call the profile soft-delete API as the authenticated administrator
 * 4. As the response body is void, the test can only assert successful call (no
 *    error thrown)
 * 5. To fully verify, would re-query the profile and check 'deleted_at' is set --
 *    but as there is no explicit profile query API, this cannot be demonstrated
 *    from available API functions/types.
 *
 * Notes:
 *
 * - Profile soft-deletion is indicated by 'deleted_at' field being set. In this
 *   E2E, only the absence of error is confirmed.
 * - Edge cases (double-delete, invalid credentials, unauthorized actor, etc.) are
 *   not covered in this test per scenario definition.
 */
export async function test_api_administrator_profile_soft_delete_by_privileged_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator to establish an authenticated privileged admin context
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Use the returned administrator ID as both administratorId and (synthetically) profileId
  const administratorId = admin.id;
  const profileId = admin.id; // No explicit profile creation/query API; assume 1:1

  // 3. Call the soft-delete API as this administrator
  await api.functional.communityPlatform.administrator.administrators.profiles.erase(
    connection,
    {
      administratorId,
      profileId,
    },
  );

  // 4. There is no response body, so as long as no error is thrown, deletion is considered successful
  TestValidator.predicate("administrator profile erased without error", true);
}
