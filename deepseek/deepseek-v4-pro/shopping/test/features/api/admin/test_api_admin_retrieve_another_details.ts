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
 * Verify that an authenticated administrator can retrieve another administrator's account details by ID.
 *
 * Validates cross-administrator visibility by registering two separate administrator accounts and confirming that one administrator can view the profile details of another. Ensures the response includes the target administrator's id, email, grade, created_at, and updated_at fields correctly, and that the password hash is excluded from the response (guaranteed by the IShoppingMallAdmin type definition).
 *
 * This validates that administrators can view other administrators' profiles as part of their platform oversight responsibilities.
 *
 * 1. Register admin1 (viewer) via authorize_admin_join on a dedicated connection.
 * 2. Register admin2 (target) via authorize_admin_join on a separate connection.
 * 3. Authenticated as admin1, call GET /shoppingMall/admin/admins/{admin2.id}.
 * 4. Validate the response with typia.assert for complete type correctness.
 * 5. Confirm every identity field matches admin2's registration values using TestValidator.equals.
 * 6. Confirm the retrieved id differs from admin1's id using TestValidator.notEquals.
 */
export async function test_api_admin_retrieve_another_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin1 (viewer)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {});
  // 2. Register admin2 (target)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {});
  // 3. Retrieve admin2's details as admin1
  const retrieved = await api.functional.shoppingMall.admin.admins.at(
    admin1Connection,
    { adminId: admin2.id },
  );
  typia.assert(retrieved);
  // 4. Validate returned fields belong to admin2, not admin1
  TestValidator.equals("admin2 id", retrieved.id, admin2.id);
  TestValidator.equals("admin2 email", retrieved.email, admin2.email);
  TestValidator.equals("admin2 grade", retrieved.grade, admin2.grade);
  TestValidator.equals(
    "admin2 created_at",
    retrieved.created_at,
    admin2.created_at,
  );
  TestValidator.equals(
    "admin2 updated_at",
    retrieved.updated_at,
    admin2.updated_at,
  );
  // 5. Confirm the retrieved id is NOT admin1's id
  TestValidator.notEquals("not admin1 id", retrieved.id, admin1.id);
}
