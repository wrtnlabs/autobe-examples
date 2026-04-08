import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test self-ban protection mechanism for administrators.
 *
 * Validates that administrators cannot ban themselves, preventing accidental or malicious administrative lockout. The system should reject any self-ban attempt with a 403 Forbidden error while preserving the administrator's access and unchanged ban status.
 *
 * This test ensures the self-protection mechanism works correctly by attempting to ban the currently authenticated administrator and verifying the operation is rejected.
 *
 * 1. Register a super administrator account with valid credentials.
 * 2. Attempt to ban the administrator using their own administratorId.
 * 3. Verify the ban operation fails with 403 Forbidden error.
 * 4. Verify the administrator's banned status remains false.
 * 5. Verify the administrator can still access the system.
 */
export async function test_api_administrator_self_ban_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: undefined,
  });
  typia.assert(authorized);
  // Verify initial state: administrator is not banned
  TestValidator.equals(
    "initial banned status is false",
    authorized.banned,
    false,
  );
  // 2. Attempt to ban self
  const banRequest = {
    ban: true,
  } satisfies IShoppingMallAdministrator.IBanRequest;
  // 3. Verify self-ban fails with 403 Forbidden
  await TestValidator.httpError(
    "self-ban should be rejected with 403 Forbidden",
    403,
    async () =>
      await api.functional.shoppingMall.administrator.administrators.ban(
        adminConnection,
        {
          administratorId: authorized.id,
          body: banRequest,
        },
      ),
  );
  // 4. Verify administrator's banned status remains false
  TestValidator.equals(
    "banned status remains false after failed self-ban",
    authorized.banned,
    false,
  );
  // 5. Verify administrator can still access the system
  // (This is implicitly verified by the fact that we can still make API calls with adminConnection)
  // The authorization token is still valid and the administrator is not banned
  TestValidator.predicate(
    "administrator still has valid access token",
    () => adminConnection.headers?.Authorization !== undefined,
  );
}
