import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function test_api_super_admin_retrieve_self_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a super admin account
  // The utility function updates connection.headers internally with the access token
  const superAdminAuth = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // Step 2: Retrieve the super admin's own account details using their ID
  // Use the same connection which now has the super admin's authorization token
  const adminDetails = await api.functional.ecommerceMall.superAdmin.admins.at(
    connection,
    {
      adminId: superAdminAuth.id,
    },
  );
  typia.assert(adminDetails);
  // Step 3: Validate the response contains expected fields and values
  TestValidator.equals(
    "super admin ID matches retrieved admin ID",
    adminDetails.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "super admin email matches retrieved admin email",
    adminDetails.email,
    superAdminAuth.email,
  );
  TestValidator.equals("admin status is active", adminDetails.status, "active");
  // Validate timestamp fields exist and are valid date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(adminDetails.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(adminDetails.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    adminDetails.deleted_at === null,
  );
}
