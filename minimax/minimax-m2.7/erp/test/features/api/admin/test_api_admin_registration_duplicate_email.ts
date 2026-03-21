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

export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin with unique email
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const firstAdmin = await api.functional.erpHrm.auth.admin.join(connection, {
    body: {
      email: uniqueEmail,
      password: password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // 2. Verify first admin was created successfully
  TestValidator.equals(
    "first admin has valid id",
    firstAdmin.id.length > 0,
    true,
  );
  TestValidator.equals(
    "first admin email matches",
    firstAdmin.email,
    uniqueEmail,
  );
  TestValidator.predicate(
    "first admin has valid UUID format",
    /^[{]?[0-9a-fA-F]{8}[-]?([0-9a-fA-F]{4}[-]?){3}[0-9a-fA-F]{12}[}]?$/.test(
      firstAdmin.id,
    ),
  );
  // 3. Attempt to register second admin with same email - should fail with duplicate error
  await TestValidator.error("duplicate email should be rejected", async () => {
    await api.functional.erpHrm.auth.admin.join(connection, {
      body: {
        email: uniqueEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IErpHrmAdmin.IJoin,
    });
  });
  // 4. Verify the original admin's account remains accessible by logging in
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.erpHrm.auth.admin.login(adminConnection, {
    body: {
      email: uniqueEmail,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.ILogin,
  });
}