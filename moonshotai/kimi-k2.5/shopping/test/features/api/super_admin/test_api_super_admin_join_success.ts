import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test successful super administrator registration.
 *
 * Verifies that the system creates a new super admin account with:
 * - Grade automatically set to 'super_admin'
 * - Generated UUID id
 * - Proper timestamps
 * - JWT authentication tokens
 * - Password not returned in response
 */
export async function test_api_super_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for isolation
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate random valid registration data
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  // Execute super admin registration
  const response = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    { body },
  );
  // Validate complete response structure
  typia.assert(response);
  // Validate business logic requirements
  TestValidator.equals("email matches input", response.email, body.email);
  TestValidator.equals("grade is super_admin", response.grade, "super_admin");
  TestValidator.equals(
    "deletedAt is null for new account",
    response.deletedAt,
    null,
  );
  TestValidator.predicate(
    "access token is present",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    response.token.refresh.length > 0,
  );
}
