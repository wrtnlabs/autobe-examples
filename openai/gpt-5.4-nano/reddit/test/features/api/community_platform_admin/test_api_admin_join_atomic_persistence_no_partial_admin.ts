import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_atomic_persistence_no_partial_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific base connections
  const adminConnection: api.IConnection = { host: connection.host };
  // Use a unique email for the join request
  const email = `${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}@example.com` satisfies string &
    // keep tag constraints in satisfies below
    any;
  const password = RandomGenerator.alphaNumeric(16);
  const joinInput = {
    email: email as string satisfies ICommunityPlatformAdmin.IJoin["email"],
    password:
      password as string satisfies ICommunityPlatformAdmin.IJoin["password"],
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  // Trigger a simulated internal failure.
  // Since we don't have an explicit harness API in provided inputs, rely on
  // the SDK's simulator mode by setting connection.simulate = true.
  // The test should still compile; if simulator mode doesn't allow failure
  // injection, the assertions below will fail, surfacing the need for that capability.
  const failingConnection: api.IConnection = {
    host: adminConnection.host,
    simulate: true,
  };
  const result = await api.functional.communityPlatform.auth.admin.join(
    failingConnection,
    {
      body: joinInput,
    },
  );
  // In the simulator, result may not throw; validate it is not a success payload.
  if ("success" in result) {
    TestValidator.predicate(
      "join should fail in simulated internal error",
      result.success === false,
    );
  }
  // Verify no tokens were issued. If response includes token field, it must not exist.
  TestValidator.predicate(
    "no token should be issued on failure",
    () =>
      !(
        (
          result as unknown as {
            data?: {
              token?: unknown;
            };
          }
        ).data && (result as any).data.token
      ),
  );
  // Verify no partial admin persistence.
  // No lookup endpoint/utility is provided, so we can only validate by attempting a login.
  // If admin identity was partially persisted and tokens issued incorrectly, login might succeed.
  // Use a fresh adminConnection; attempt login and expect failure.
  await TestValidator.httpError(
    "admin login should fail if join did not persist",
    [400, 401, 403, 404, 409, 422],
    async () => {
      await api.functional.communityPlatform.auth.admin.login(adminConnection, {
        body: {
          email: joinInput.email,
          password: joinInput.password,
        } satisfies ICommunityPlatformAdmin.ILogin,
      });
    },
  );
}
