import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdminPasswordReset";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_password_reset_initiation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
    } satisfies IEconomicForumAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Initiate password reset for the created admin's email
  const resetConnection: api.IConnection = { host: connection.host };
  await api.functional.economicForum.admin.auth.admins.password.resets.create(
    resetConnection,
    {
      body: {
        email: admin.email,
      } satisfies IEconomicForumAdminPasswordReset.IRequest,
    },
  );
  // Step 3: Verify that a second reset request with the same email fails due to rate limiting
  await TestValidator.error(
    "second reset request within 10 minutes should fail due to rate limiting",
    async () => {
      await api.functional.economicForum.admin.auth.admins.password.resets.create(
        resetConnection,
        {
          body: {
            email: admin.email,
          } satisfies IEconomicForumAdminPasswordReset.IRequest,
        },
      );
    },
  );
  // Step 4: Verify that an invalid email address behaves identically (no enumeration)
  // This must succeed silently with 200 OK and no response body, just like the valid case
  const invalidEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.economicForum.admin.auth.admins.password.resets.create(
    resetConnection,
    {
      body: {
        email: invalidEmail,
      } satisfies IEconomicForumAdminPasswordReset.IRequest,
    },
  );
  // No validation needed here because if this threw an error,
  // it would have been caught above — but we must NOT throw,
  // so we just execute and trust the system behaves correctly.
  // Since the API is designed to be identical for valid and invalid emails,
  // a successful non-throwing response with no body confirms our expectations.
}
