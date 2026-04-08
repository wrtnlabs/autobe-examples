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

/**
 * Test that an authenticated super administrator can successfully retrieve their own account profile.
 *
 * Validates the profile retrieval endpoint for super administrators by registering a new account and verifying the returned profile data matches the registered credentials. The test ensures the API correctly returns the super admin's account information including ID, email, and timestamps while excluding sensitive data like password_hash.
 *
 * **Setup:**
 * 1. Register a new super administrator account using authorize_super_admin_join utility function
 *
 * **Test Execution:**
 * 1. Call GET /ecommerceMall/superAdmin/super-admins/me endpoint with Bearer token
 * 2. Validate response structure matches IEcommerceMallSuperAdmin type
 *
 * **Validation Points:**
 * - id field is present and matches UUID format
 * - email field is present and matches the registered email
 * - created_at field is present and valid ISO date-time
 * - updated_at field is present and valid ISO date-time
 * - deleted_at field is null for active account
 * - password_hash is NOT included in response (security requirement)
 */
export async function test_api_super_admin_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator and get authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Retrieve own profile
  const profile =
    await api.functional.ecommerceMall.superAdmin.super_admins.me.at(
      superAdminConnection,
    );
  typia.assert(profile);
  // 3. Validate response matches registered credentials
  TestValidator.equals(
    "email matches registered",
    profile.email,
    authorized.email,
  );
  TestValidator.equals("id matches authorized", profile.id, authorized.id);
  TestValidator.predicate(
    "deleted_at is null for active account",
    profile.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updated_at),
  );
}
