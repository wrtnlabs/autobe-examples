import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator self-profile retrieval.
 *
 * Test that an authenticated administrator can retrieve their own profile information
 * through the admin profile endpoint. This scenario validates the self-reference use case
 * where an administrator joins the system and then retrieves their own profile using
 * their own adminId as the path parameter.
 */
export async function test_api_admin_self_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve admin's own profile using their adminId
  const profile = await api.functional.ecommerceMall.admin.admins.at(
    adminConnection,
    {
      adminId: authResult.id,
    },
  );
  typia.assert(profile);
  // 3. Validate all expected fields are present
  TestValidator.equals("admin ID matches", profile.id, authResult.id);
  TestValidator.equals("email matches", profile.email, authResult.email);
  TestValidator.equals(
    "admin grade is regular",
    profile.admin_grade,
    "regular",
  );
  TestValidator.equals(
    "account status is active",
    profile.account_status,
    "active",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    profile.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}