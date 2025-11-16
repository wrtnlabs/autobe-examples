import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSettings";

/**
 * Validate admin-only creation and uniqueness of platform-wide system settings.
 *
 * This test covers the full authenticated admin workflow for creating a new
 * system setting, their audit fields, business uniqueness constraints, and
 * error handling for unauthorized and duplicate key creation attempts.
 *
 * 1. Register an administrator with a unique email and password
 * 2. Create a new global system setting with a unique key as the administrator
 * 3. Verify returned setting contains correct key/value/description, and audit
 *    metadata (created_at, updated_at)
 * 4. Attempt to create another setting with the same key (expect business error)
 * 5. Attempt to create a system setting with no authentication (expect rejection)
 */
export async function test_api_system_setting_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = typia.random<string & tags.Format<"password">>();
  const adminCreateBody = {
    email: admin_email,
    password: admin_password,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuth);

  // 2. Create unique system setting with authenticated admin
  const systemSettingKey = RandomGenerator.alphaNumeric(12);
  const createRequestBody = {
    key: systemSettingKey,
    value: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformSystemSettings.ICreate;

  const createdSetting: ICommunityPlatformSystemSettings =
    await api.functional.communityPlatform.administrator.systemSettings.create(
      connection,
      { body: createRequestBody },
    );
  typia.assert(createdSetting);

  // 3. Verify created setting fields
  TestValidator.equals(
    "key matches input",
    createdSetting.key,
    createRequestBody.key,
  );
  TestValidator.equals(
    "value matches input",
    createdSetting.value,
    createRequestBody.value,
  );
  TestValidator.equals(
    "description matches input",
    createdSetting.description,
    createRequestBody.description,
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof createdSetting.created_at === "string" &&
      createdSetting.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof createdSetting.updated_at === "string" &&
      createdSetting.updated_at.length > 0,
  );

  // 4. Attempt to create a setting with same key (should be rejected by uniqueness)
  await TestValidator.error(
    "duplicate setting key should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.systemSettings.create(
        connection,
        { body: { ...createRequestBody } },
      );
    },
  );

  // 5. Attempt to create a system setting with no authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated creation attempt is rejected",
    async () => {
      await api.functional.communityPlatform.administrator.systemSettings.create(
        unauthConn,
        {
          body: {
            key: RandomGenerator.alphaNumeric(10),
            value: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformSystemSettings.ICreate,
        },
      );
    },
  );
}
