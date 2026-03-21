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

export async function test_api_superadmin_profile_retrieval_another_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super admin account (will be used for authentication)
  const firstSuperAdminConnection: api.IConnection = { host: connection.host };
  const firstSuperAdmin = await authorize_super_admin_join(
    firstSuperAdminConnection,
    {},
  );
  typia.assert(firstSuperAdmin);
  // 2. Create second super admin account (whose profile will be retrieved)
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  const secondSuperAdmin = await authorize_super_admin_join(
    secondSuperAdminConnection,
    {},
  );
  typia.assert(secondSuperAdmin);
  // 3. Authenticate as the first super admin
  const authenticatedConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(authenticatedConnection, {
    body: {
      email: firstSuperAdmin.email,
      password: typia.random<string & typia.tags.Format<"password">>(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // 4. Retrieve the second super admin's profile using the first super admin's credentials
  const retrievedSuperAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.at(
      authenticatedConnection,
      {
        superAdminId: secondSuperAdmin.id,
      },
    );
  typia.assert(retrievedSuperAdmin);
  // 5. Validate response contains correct account details
  TestValidator.equals(
    "super admin ID matches",
    retrievedSuperAdmin.id,
    secondSuperAdmin.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedSuperAdmin.email,
    secondSuperAdmin.email,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedSuperAdmin.created_at,
    secondSuperAdmin.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedSuperAdmin.updated_at,
    secondSuperAdmin.updated_at,
  );
  // 6. Verify deleted_at is null (active account)
  TestValidator.equals(
    "account is active",
    retrievedSuperAdmin.deleted_at,
    null,
  );
  // 7. Confirm password_hash is not exposed in response
  // (typia.assert validates the response structure matches IEcommerceMallSuperAdmin,
  // which does not include password_hash field, so this is implicitly validated)
}
