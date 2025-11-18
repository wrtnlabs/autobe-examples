import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that updating a non-existent system setting key fails without
 * creating a new setting.
 *
 * Business goal: Ensure that the administrative endpoint PUT
 * /todoApp/adminUser/systemSettings/{settingKey} does not implicitly create new
 * configuration rows when called with an unknown key. Instead, it must fail in
 * a not-found style manner for such keys, while still requiring proper admin
 * authentication and a structurally valid update payload.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate an admin user via POST /auth/adminUser/join,
 *    obtaining an ITodoAppAdminUser.IAuthorized response. The SDK will
 *    automatically attach the access token to the shared connection for
 *    subsequent adminUser calls.
 * 2. Construct two distinct, highly unlikely-to-exist setting keys (e.g., prefixed
 *    with "e2e_unknown_setting_") and a valid ITodoAppSystemSetting.IUpdate
 *    payload.
 * 3. Attempt to call PUT /todoApp/adminUser/systemSettings/{settingKey} with the
 *    first unknown key and the valid update body, and assert that the operation
 *    fails by throwing an error (business-level not-found behavior).
 * 4. Repeat the update attempt with the second unknown key (optionally varying the
 *    update body slightly) and again assert that an error is thrown.
 *
 * By using valid authentication and structurally correct DTOs, any failure
 * observed is attributed to the non-existence of the targeted system setting
 * key rather than type validation problems. This test does not inspect specific
 * HTTP status codes, but the error thrown by the SDK suffices to confirm that
 * unknown keys are not silently upserted.
 */
export async function test_api_system_setting_update_not_found_for_unknown_key(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const joinBody = typia.random<ITodoAppAdminUser.IJoin>();

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(admin);

  // 2. Prepare non-existent setting keys
  const unknownKey1 = `e2e_unknown_setting_${RandomGenerator.alphaNumeric(16)}`;
  const unknownKey2 = `e2e_unknown_setting_${RandomGenerator.alphaNumeric(16)}`;

  // 3. Prepare a valid update payload for ITodoAppSystemSetting.IUpdate
  const updateBody1 = {
    value: "42",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.IUpdate;

  const updateBody2 = {
    value: "true",
    type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    group: "features",
    enabled: false,
  } satisfies ITodoAppSystemSetting.IUpdate;

  // 4. Attempt update with the first unknown key and expect an error
  await TestValidator.error(
    "updating an unknown system setting key (unknownKey1) should fail",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.update(connection, {
        settingKey: unknownKey1,
        body: updateBody1,
      });
    },
  );

  // 5. Attempt update with the second unknown key and expect an error
  await TestValidator.error(
    "updating another unknown system setting key (unknownKey2) should also fail",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.update(connection, {
        settingKey: unknownKey2,
        body: updateBody2,
      });
    },
  );
}
