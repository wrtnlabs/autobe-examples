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
 * Test that an authenticated administrator can retrieve their own account details by ID.
 *
 * Validates the primary happy path of administrator self-profile retrieval. After
 * registering a new administrator account via join, the returned admin ID is used
 * to call the retrieval endpoint. The test confirms the response includes the
 * correct id matching the joined account, the email used during registration,
 * grade equal to 'regular' (default for newly joined admins), and both created_at
 * and updated_at timestamps in valid ISO 8601 format.
 *
 * Special attention is given to security: the test verifies that the password hash
 * field is never present in the response, as mandated by the specification for
 * exclusion.
 *
 * 1. Register a new administrator account using authorize_admin_join.
 * 2. Retrieve the administrator details by the returned admin ID.
 * 3. Validate response contains correct id, email, grade, and timestamps.
 * 4. Verify password_hash is excluded from the response for security.
 */
export async function test_api_admin_retrieve_own_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new admin
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {});
  typia.assert(joinResult);
  // 2. Retrieve own admin details
  const admin = await api.functional.shoppingMall.admin.admins.at(
    adminConnection,
    { adminId: joinResult.id },
  );
  typia.assert(admin);
  // 3. Validate response fields
  TestValidator.equals("admin id matches", admin.id, joinResult.id);
  TestValidator.equals("email matches", admin.email, joinResult.email);
  TestValidator.equals("grade is regular", admin.grade, "regular");
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(admin.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(admin.updated_at)),
  );
  // 4. Verify password_hash is not present
  TestValidator.predicate(
    "password_hash excluded",
    !("password_hash" in admin),
  );
}
