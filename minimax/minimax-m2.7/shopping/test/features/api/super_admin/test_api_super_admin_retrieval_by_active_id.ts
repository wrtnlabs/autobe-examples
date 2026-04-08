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
 * Test retrieving detailed information for an active super administrator account.
 *
 * Validates the GET endpoint for fetching super admin details by ID. The flow involves:
 * 1. Registering a new super administrator via join endpoint to create authentication context
 * 2. Extracting the superAdminId from the join response
 * 3. Making an authenticated GET request to retrieve the super admin details
 * 4. Validating response contains expected fields (id, email, created_at, updated_at)
 * 5. Verifying deleted_at is null for active account
 * 6. Ensuring password_hash is not exposed (security requirement)
 *
 * The test ensures the API correctly returns super administrator account details while
 * maintaining security by not exposing sensitive fields.
 */
export async function test_api_super_admin_retrieval_by_active_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator using the join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Extract the superAdminId from the join response
  const superAdminId = authorized.id;
  // 3. Make a GET request to retrieve the super admin details
  const retrievedSuperAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.at(
      superAdminConnection,
      {
        superAdminId: superAdminId,
      },
    );
  // 4. Validate response using typia.assert()
  typia.assert(retrievedSuperAdmin);
  // 5. Verify id matches the registered account
  TestValidator.equals(
    "id matches registered account",
    retrievedSuperAdmin.id,
    superAdminId,
  );
  // 6. Verify email matches
  TestValidator.equals(
    "email matches",
    retrievedSuperAdmin.email,
    authorized.email,
  );
  // 7. Verify timestamps are present (ISO datetime format)
  TestValidator.predicate(
    "created_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedSuperAdmin.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedSuperAdmin.updated_at),
  );
  // 8. Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    retrievedSuperAdmin.deleted_at,
    null,
  );
  // 9. Verify password_hash is NOT included in response (security requirement)
  // This is ensured by typia.assert() validating against IEcommerceMallSuperAdmin type
  // which does not contain password_hash field
  TestValidator.predicate(
    "response does not contain password_hash",
    !("password_hash" in retrievedSuperAdmin),
  );
}
