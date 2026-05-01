import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin login security: non-existent email must not leak account existence.
 *
 * Validates that the authentication endpoint does not reveal whether an email
 * address is registered as an administrator. Attempts login with a non-existent
 * email and separately with a real email but wrong password, then compares the
 * error responses to confirm they are identical.
 *
 * 1. Create a real administrator account via join to obtain valid credentials
 *    for the wrong-password comparison scenario.
 * 2. Attempt login with a random non-existent email and arbitrary password.
 * 3. Attempt login with the real administrator email but a wrong password.
 * 4. Verify both attempts return 401 Unauthorized.
 * 5. Verify the error response messages are identical, confirming no account
 *    existence information is leaked through error differentiation.
 */
export async function test_api_admin_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a real admin account for comparison purposes
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Session context shared across login attempts
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();
  // 2. Attempt login with a non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  let nonExistentError: api.HttpError | null = null;
  try {
    await api.functional.shoppingMall.auth.admin.login(
      { host: connection.host },
      {
        body: {
          email: nonExistentEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: sessionHref,
          referrer: sessionReferrer,
        } satisfies IShoppingMallAdmin.ILogin,
      },
    );
    throw new Error("Non-existent email login unexpectedly succeeded");
  } catch (e) {
    if (e instanceof api.HttpError) {
      nonExistentError = e;
    } else {
      throw e;
    }
  }
  // 3. Attempt login with correct email but wrong password
  let wrongPasswordError: api.HttpError | null = null;
  try {
    await api.functional.shoppingMall.auth.admin.login(
      { host: connection.host },
      {
        body: {
          email: admin.email,
          password: RandomGenerator.alphaNumeric(16),
          href: sessionHref,
          referrer: sessionReferrer,
        } satisfies IShoppingMallAdmin.ILogin,
      },
    );
    throw new Error("Wrong password login unexpectedly succeeded");
  } catch (e) {
    if (e instanceof api.HttpError) {
      wrongPasswordError = e;
    } else {
      throw e;
    }
  }
  // 4. Verify both return 401 Unauthorized
  TestValidator.equals(
    "non-existent email returns 401",
    nonExistentError!.status,
    401,
  );
  TestValidator.equals(
    "wrong password returns 401",
    wrongPasswordError!.status,
    401,
  );
  // 5. Verify error messages are identical (no account existence leak)
  TestValidator.equals(
    "error messages identical — no account existence leak",
    nonExistentError!.message,
    wrongPasswordError!.message,
  );
}
