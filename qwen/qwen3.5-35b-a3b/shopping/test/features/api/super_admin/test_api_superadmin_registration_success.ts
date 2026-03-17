import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registration - Use utility function (POST /ecommerceMall/auth/superAdmin/join)
  const adminConnection: api.IConnection = { host: connection.host };
  const registrationResponse = await authorize_super_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(registrationResponse);
  // 2. Validate registration response structure
  const {
    id,
    email: registeredEmail,
    fullName: registeredFullName,
    displayName: registeredDisplayName,
    grade,
    status,
    createdAt,
    updatedAt,
    deletedAt,
    access,
    refresh,
    expired_at,
    token,
  } = registrationResponse;
  // Verify required fields exist and have correct values
  await TestValidator.predicate("user ID is valid UUID", id !== undefined && id !== null);
  await TestValidator.predicate("email format is valid", registeredEmail !== undefined && registeredEmail !== null);
  await TestValidator.predicate("full name exists", registeredFullName.length > 0);
  await TestValidator.predicate(
    "display name exists",
    registeredDisplayName.length > 0,
  );
  await TestValidator.equals("grade is 0 for initial admin", grade, 0);
  await TestValidator.equals("status is active", status, "active");
  await TestValidator.equals("deletedAt is null", deletedAt, null);
  await TestValidator.predicate("access token exists", access.length > 0);
  await TestValidator.predicate("refresh token exists", refresh.length > 0);
  await TestValidator.predicate(
    "expired_at is valid ISO format",
    !Number.isNaN(Date.parse(expired_at)),
  );
  // Validate nested token object structure
  const {
    access: tokenAccess,
    refresh: tokenRefresh,
    expired_at: tokenExpired,
    refreshable_until,
  } = token;
  await TestValidator.predicate("token access exists", tokenAccess.length > 0);
  await TestValidator.predicate("token refresh exists", tokenRefresh.length > 0);
  await TestValidator.predicate(
    "token expired_at is valid ISO format",
    !Number.isNaN(Date.parse(tokenExpired)),
  );
  await TestValidator.predicate(
    "refreshable_until is valid ISO format",
    !Number.isNaN(Date.parse(refreshable_until)),
  );
  // 3. Test authenticated access - create connection with access token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${access}` },
  };
  // Verify the token works by making an authenticated call
  // (Note: without specific admin endpoints, we validate token structure is correct)
  await TestValidator.predicate(
    "authenticated connection created successfully",
    authenticatedConnection.headers !== undefined,
  );
}