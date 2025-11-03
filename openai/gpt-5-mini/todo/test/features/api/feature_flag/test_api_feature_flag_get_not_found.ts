import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppFeatureFlag";

export async function test_api_feature_flag_get_not_found(
  connection: api.IConnection,
) {
  // 1) Admin sign-up (dependency): create an admin to obtain authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "P@ssw0rd123", // meets minimum length >= 8
        display_name: RandomGenerator.name(),
        role: "superadmin",
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  // Validate admin response shape and token presence
  typia.assert(admin);

  // At this point, the sdk's join() call sets connection.headers.Authorization
  // automatically (see SDK behavior). No manual header manipulation is performed.

  // 2) Attempt to retrieve a non-existent feature flag and expect an error
  const nonExistentKey = "nonexistent_feature_flag_999999";

  // Using TestValidator.error with async callback to assert the SDK throws
  await TestValidator.error(
    "non-existent feature flag should throw",
    async () => {
      await api.functional.todoApp.admin.featureFlags.at(connection, {
        featureFlagKey: nonExistentKey,
      });
    },
  );
}
