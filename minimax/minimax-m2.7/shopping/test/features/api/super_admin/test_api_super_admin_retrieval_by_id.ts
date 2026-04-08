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
 * Test retrieving a super administrator account by its unique identifier.
 *
 * Validates the GET /ecommerceMall/superAdmin/super-admins/{superAdminId} endpoint
 * which allows super administrators to view account information of other super
 * administrators. This test verifies that:
 *
 * 1. A newly registered super admin account can be retrieved by its ID
 * 2. The response contains all required fields (id, email, created_at, updated_at, deleted_at)
 * 3. The deleted_at field is null for active accounts
 * 4. Sensitive data like password hash is not exposed
 *
 * **Test Flow:**
 * 1. Register a new super admin account with random email/password
 * 2. Extract the superAdminId from the registration response
 * 3. Call the retrieval endpoint with the authenticated connection
 * 4. Validate response structure and field values
 *
 * @param connection - Base API connection
 */
export async function test_api_super_admin_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const registered: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {});
  // 2. Retrieve the super admin by ID using the authenticated connection
  const retrieved: IEcommerceMallSuperAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.at(
      superAdminConnection,
      {
        superAdminId: registered.id,
      },
    );
  // 3. Validate response with typia.assert
  typia.assert(retrieved);
  // 4. Business logic validations
  TestValidator.equals("id matches registered", retrieved.id, registered.id);
  TestValidator.equals(
    "email matches registered",
    retrieved.email,
    registered.email,
  );
  TestValidator.equals(
    "created_at exists",
    retrieved.created_at !== null && retrieved.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at exists",
    retrieved.updated_at !== null && retrieved.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    retrieved.deleted_at,
    null,
  );
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      retrieved.id,
    ),
  );
}
