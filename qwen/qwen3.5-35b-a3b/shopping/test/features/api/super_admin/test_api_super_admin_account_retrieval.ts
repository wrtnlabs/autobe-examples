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

export async function test_api_super_admin_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create second super administrator account (Admin 2)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Data = await authorize_super_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(admin2Data);
  // 2. Authenticate as first super administrator (Admin 1)
  const admin1Connection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // 3. Admin 1 retrieves Admin 2's account details
  const retrievedAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.at(
      admin1Connection,
      {
        superAdminId: admin2Data.id,
      },
    );
  typia.assert(retrievedAdmin);
  // 4. Validate retrieved account details match original
  TestValidator.equals(
    "super admin id matches",
    retrievedAdmin.id,
    admin2Data.id,
  );
  TestValidator.equals("email matches", retrievedAdmin.email, admin2Data.email);
  TestValidator.equals(
    "display name matches",
    retrievedAdmin.displayName,
    admin2Data.displayName,
  );
  TestValidator.equals(
    "full name matches",
    retrievedAdmin.fullName,
    admin2Data.fullName,
  );
  TestValidator.equals("grade matches", retrievedAdmin.grade, admin2Data.grade);
  TestValidator.equals(
    "status matches",
    retrievedAdmin.status,
    admin2Data.status,
  );
  // 5. Validate status is active
  TestValidator.equals(
    "account status is active",
    retrievedAdmin.status,
    "active",
  );
  // 6. Validate grade is valid int32
  TestValidator.predicate(
    "grade is valid int32",
    retrievedAdmin.grade >= -2147483648 && retrievedAdmin.grade <= 2147483647,
  );
}
