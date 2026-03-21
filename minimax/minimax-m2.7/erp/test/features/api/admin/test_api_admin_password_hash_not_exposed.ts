import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_hash_not_exposed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin account via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Login as the created admin to obtain authentication credentials
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loginConnection, {
    body: {
      email: authorized.email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Call GET /erpHrm/admin/admins/{adminId} to retrieve admin details
  const admin = await api.functional.erpHrm.admin.admins.at(loginConnection, {
    adminId: authorized.id,
  });
  // 4. Validate that password_hash field is NOT present in the response
  TestValidator.predicate(
    "password_hash must not be exposed in admin details response",
    (admin as Record<string, unknown>).password_hash === undefined,
  );
  // 5. Validate the response structure matches IErpHrmAdmin
  typia.assert(admin);
}