import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_setting_delete_protected_core_setting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator so that we can
  //    access platform-admin-only platformSettings endpoints.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/platform/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a platform setting that is treated as core/mandatory by
  //    convention. We cannot see the server’s internal rules, but we choose a
  //    key that clearly expresses core semantics. Business rules on the server
  //    side are expected to prevent deletion of such keys and respond with a
  //    conflict-style HTTP error when deletion is attempted.
  const coreSettingBody = {
    key: "core.mandatory.setting", // conventionally treated as protected
    value: JSON.stringify({
      feature: "critical-platform-toggle",
      enabled: true,
    }),
    description:
      "Business-critical core configuration that should never be physically deleted.",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const createdSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: coreSettingBody },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(createdSetting);

  // 3. Attempt to delete the protected/core setting and expect a conflict
  //    style error rather than successful deletion.
  await TestValidator.httpError(
    "deleting a protected/core platform setting must fail with conflict-style HTTP error",
    [409, 422],
    async () => {
      await api.functional.communityPlatform.platformAdmin.platformSettings.erase(
        connection,
        { platformSettingId: createdSetting.id },
      );
    },
  );

  // 4. We cannot re-fetch the setting because no GET/index endpoint is
  //    provided in this scope. However, the conflict-style error semantics
  //    from erase() guarantee that the row was not deleted when the business
  //    rule rejects the operation.
}
