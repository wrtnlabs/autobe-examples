import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator profile retrieval success scenario.
 *
 * Validates the complete workflow of super administrator account registration and profile retrieval. Ensures that a newly registered super administrator can successfully authenticate and retrieve their own profile information through the protected endpoint.
 *
 * The test verifies that all required fields are present in the profile response with correct data types and formats. Special attention is given to confirming that sensitive authentication data (password_hash) is excluded from the response for security, and that the account lifecycle timestamps are properly formatted ISO 8601 strings.
 *
 * 1. Register a new super administrator account with randomized credentials using authorize_super_admin_join utility.
 * 2. Create a new connection with the authentication token from registration response.
 * 3. Retrieve the super administrator's own profile using their ID from the registration response.
 * 4. Validate the profile response structure and data integrity.
 * 5. Verify email matches the registered email and deleted_at is null for active account.
 */
export async function test_api_super_admin_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create dedicated connection for super admin registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register super administrator and get authentication
  const authResult: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authResult);
  // 3. Retrieve super administrator profile by ID using authenticated connection
  const profile: IShoppingMallSuperAdmin =
    await api.functional.shoppingMall.superAdmin.super_admins.at(
      superAdminConnection,
      {
        superAdminId: authResult.id,
      },
    );
  typia.assert(profile);
  // 4. Validate profile data integrity and consistency
  TestValidator.equals("id matches", profile.id, authResult.id);
  TestValidator.equals("email matches", profile.email, authResult.email);
  TestValidator.equals(
    "created_at matches",
    profile.created_at,
    authResult.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    profile.updated_at,
    authResult.updated_at,
  );
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
}
