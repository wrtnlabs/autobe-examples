import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumSiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumSiteSetting";

export async function test_api_site_setting_update_by_registered_user_forbidden(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure that non-administrator registered users cannot update site
   *   configuration via the administrator-only endpoint.
   *
   * Steps:
   *
   * 1. Register a new regular user via auth.registeredUser.join
   * 2. Attempt to call the admin-only siteSettings.put endpoint as that user
   * 3. Expect the operation to fail (error thrown). Do not assert HTTP status code
   *    numerically here to keep the test resilient; the presence of an
   *    authorization failure is the core expectation.
   *
   * Preconditions (test harness):
   *
   * - The test DB must be seeded with at least one site setting. If the API
   *   requires an id in the payload to target a specific setting, the test
   *   harness should expose that id or provide a read API. This test assumes
   *   the server will reject the request on authorization grounds before any
   *   mutation occurs.
   */

  // 1) Register a new regular user (join)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234", // meets suggested minimum length
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  // Runtime type validation for the authorized response
  typia.assert(registered);

  // At this point, SDK's join() implementation sets connection.headers.Authorization
  // with the returned access token so subsequent calls are made as the new user.

  // 2) Prepare a legitimate-looking update payload that conforms to IUpdate
  //    (we do not invent properties beyond the provided DTO)
  const updateBody = {
    value: "attempted-non-admin-update",
    description: "Attempted update by regular user should be forbidden",
    // environment and is_public are optional; omit them to avoid changing intent
  } satisfies IEconPoliticalForumSiteSetting.IUpdate;

  // 3) Attempt the admin-only PUT as a non-admin user and expect an error
  await TestValidator.error(
    "non-admin user cannot update site settings",
    async () => {
      await api.functional.econPoliticalForum.administrator.siteSettings.put(
        connection,
        {
          body: updateBody,
        },
      );
    },
  );

  // Note: DB-level assertions (that the row remained unchanged and that no
  // admin audit entry exists) require either (a) an admin read/audit API or
  // (b) direct test-harness DB access. The SDK materials provided do not
  // include such read/audit functions, so these checks must be implemented in
  // the test harness separately. Suggested harness steps:
  //  - Seed the setting before test and capture its original serialized value
  //  - After the test, query the DB directly (or via admin API) and assert the
  //    persisted value equals the original value and no new audit row is present
}
