import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppFeatureFlag";

export async function test_api_feature_flag_get_invalid_key(
  connection: api.IConnection,
) {
  // 1) Create an admin account (join) to obtain authorization for admin-scoped API
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123",
    href: "http://localhost/",
    referrer: "http://localhost/",
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminBody,
    },
  );
  typia.assert(admin);

  // 2) Attempt to retrieve a feature flag using a malformed featureFlagKey (empty string)
  // Behavior depends on SDK mode:
  // - Simulation mode (connection.simulate === true): NestiaSimulator typically returns a simulated record (no 400). In that case, validate the simulated output shape.
  // - Real server mode: Expect an error (await TestValidator.error) because the server should validate non-empty key and return 400.

  if (connection.simulate === true) {
    // Simulation: the SDK returns a simulated feature flag even for empty key. Validate the shape instead of expecting a throw.
    const got: ITodoAppFeatureFlag =
      await api.functional.todoApp.admin.featureFlags.at(connection, {
        featureFlagKey: "",
      });
    typia.assert(got);
    TestValidator.predicate(
      "simulation mode: featureFlags.at returned a feature flag object for empty key",
      typeof got === "object" && typeof got.key === "string",
    );
  } else {
    // Real server: expect a validation error (400). Use TestValidator.error with async callback.
    await TestValidator.error(
      "GET /todoApp/admin/featureFlags with malformed featureFlagKey should fail",
      async () => {
        await api.functional.todoApp.admin.featureFlags.at(connection, {
          featureFlagKey: "",
        });
      },
    );
  }
}
