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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a superAdmin account to have authorization for retrieving admin info
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create an admin account to retrieve its details
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. SuperAdmin retrieves the admin's detailed information
  const admin = await api.functional.ecommerceMall.superAdmin.admins.at(
    superAdminConnection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(admin);
  // 4. Validate response contains required fields
  TestValidator.equals("admin id matches", admin.id, adminAuth.id);
  TestValidator.equals("admin email matches", admin.email, adminAuth.email);
  TestValidator.equals("admin name matches", admin.name, adminAuth.name);
  TestValidator.predicate("has created_at", admin.created_at !== undefined);
  TestValidator.predicate("has updated_at", admin.updated_at !== undefined);
  TestValidator.equals(
    "deleted_at is null for active account",
    admin.deleted_at,
    null,
  );
  // 5. Verify password_hash is NOT present in the response (security requirement)
  TestValidator.predicate(
    "password_hash not in response",
    !("password_hash" in admin),
  );
}
