import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSettings";

/**
 * Test that a platform administrator can successfully retrieve a specific
 * global system setting by its unique key, and that unauthenticated access is
 * denied.
 *
 * Workflow:
 *
 * 1. Register a platform administrator (establish admin authentication context)
 * 2. Retrieve a known pre-seeded system setting via the admin endpoint.
 * 3. Assert response shape via typia.assert() for strict DTO validation.
 * 4. Validate that unauthenticated requests to the same resource are rejected.
 */
export async function test_api_system_setting_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Test1234!";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Query a well-known system setting key (should exist from fixture/migration)
  // For this test, assume "site_title" is present as a default key (typical for community platforms)
  const settingKey = "site_title";

  const setting =
    await api.functional.communityPlatform.administrator.systemSettings.at(
      connection,
      {
        key: settingKey,
      },
    );
  typia.assert(setting);
  TestValidator.equals(
    "system setting key should match",
    setting.key,
    settingKey,
  );

  // 3. Validate unauthenticated access is rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "retrieval must fail when unauthenticated",
    async () => {
      await api.functional.communityPlatform.administrator.systemSettings.at(
        unauthConn,
        {
          key: settingKey,
        },
      );
    },
  );
}
