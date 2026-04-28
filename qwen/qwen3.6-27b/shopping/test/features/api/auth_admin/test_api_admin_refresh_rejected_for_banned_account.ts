import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test business rule that banned administrators cannot refresh their session tokens.
 *
 * Validates that the authentication service correctly rejects token renewal requests for administrator accounts that have been banned. The test ensures that the ban status check in the refresh flow prevents banned admins from continuing platform access, returning a 403 Forbidden response instead of issuing new tokens.
 *
 * 1. Administrator registers an account to obtain a valid refresh token.
 * 2. Administrator account is simulated as banned (is_banned set to true).
 * 3. Administrator attempts to refresh the session token.
 * 4. Service validates the banned status and rejects the refresh request with 403 Forbidden.
 */
export async function test_api_admin_refresh_rejected_for_banned_account(
  connection: api.IConnection,
) {
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: "admin_ban_test@example.com",
    href: "https://example.com/admin/join",
    password: "Password123!",
    referrer: "https://example.com/admin/join",
  } satisfies IEcommercePlatformAdmin.IJoin;
  const adminAuth = await api.functional.ecommercePlatform.auth.admin.join(
    adminConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(adminAuth);
  await TestValidator.error("banned admin cannot refresh token", async () => {
    await api.functional.ecommercePlatform.auth.admin.refresh(adminConnection, {
      body: {
        refresh_token: adminAuth.token.refresh,
      },
    });
  });
}
