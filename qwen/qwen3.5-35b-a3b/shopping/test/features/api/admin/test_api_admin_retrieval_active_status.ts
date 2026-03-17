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

export async function test_api_admin_retrieval_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator for platform oversight
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a test admin account (target for retrieval)
  const testAdminConnection: api.IConnection = { host: connection.host };
  const testAdmin = await authorize_admin_join(testAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(testAdmin);
  // 3. Use super admin connection to retrieve the test admin details
  const retrievedAdmin = await api.functional.ecommerceMall.admin.admins.at(
    superAdminConnection,
    {
      adminId: testAdmin.id,
    },
  );
  typia.assert(retrievedAdmin);
  // 4. Validate the response
  TestValidator.equals(
    "admin status is active",
    retrievedAdmin.status,
    "active",
  );
  TestValidator.equals(
    "admin deleted_at is null",
    retrievedAdmin.deleted_at,
    null,
  );
  TestValidator.equals("admin id matches", retrievedAdmin.id, testAdmin.id);
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    testAdmin.email,
  );
  TestValidator.notEquals(
    "admin has valid creation timestamp",
    retrievedAdmin.created_at,
    undefined,
  );
  TestValidator.notEquals(
    "admin has valid update timestamp",
    retrievedAdmin.updated_at,
    undefined,
  );
}
