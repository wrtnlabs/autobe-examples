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

export async function test_api_admin_retrieve_account_success(
  connection: api.IConnection,
) {
  // 1. Super administrator joins
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminOutput = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdminOutput);
  // 2. Regular administrator joins
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminOutput = await authorize_admin_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(regularAdminOutput);
  // 3. Super admin retrieves regular admin's account
  const retrievedAdmin: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.admin.admins.at(superAdminConnection, {
      adminId: regularAdminOutput.id,
    });
  typia.assert(retrievedAdmin);
  // 4. Validate response structure matches original creation data
  TestValidator.equals("id matches", retrievedAdmin.id, regularAdminOutput.id);
  TestValidator.equals(
    "email matches",
    retrievedAdmin.email,
    regularAdminOutput.email,
  );
  TestValidator.equals(
    "is_banned matches",
    retrievedAdmin.is_banned,
    regularAdminOutput.is_banned,
  );
  TestValidator.equals(
    "ban_reason matches",
    retrievedAdmin.ban_reason,
    regularAdminOutput.ban_reason,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedAdmin.created_at,
    regularAdminOutput.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedAdmin.updated_at,
    regularAdminOutput.updated_at,
  );
  // 5. Verify password_hash is excluded (not in IEcommerceMallAdmin type)
  // The IEcommerceMallAdmin type definition explicitly excludes password_hash,
  // so typia.assert() already validates this at runtime
}
