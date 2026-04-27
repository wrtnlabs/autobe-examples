import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator can retrieve details of another super administrator.
 *
 * Creates two regular administrators (Admin A and Admin B), promotes both to super administrator status using the bootstrapped super administrator's authentication context, then queries Admin A's profile using Admin B's super administrator credentials. Validates that the response contains the correct `id`, `email`, a `grade` of `"super"`, and a `null` `deleted_at` field.
 *
 * 1. Register Admin A (regular) and promote to super administrator.
 * 2. Register Admin B (regular) and promote to super administrator.
 * 3. Admin B retrieves Admin A's administrator profile.
 * 4. Validate response fields including grade computation.
 */
export async function test_api_administrator_retrieve_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Admin A as a regular administrator
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminA);
  // 2. Promote Admin A to super administrator using the bootstrapped super admin
  const promoteAConnection: api.IConnection = {
    host: connection.host,
    headers: { ...connection.headers },
  };
  const adminASuper = await authorize_super_administrator_join(
    promoteAConnection,
    {
      body: {
        administrator_id: adminA.id,
      },
    },
  );
  typia.assert(adminASuper);
  // 3. Register Admin B as a regular administrator
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminB);
  // 4. Promote Admin B to super administrator using the bootstrapped super admin
  const promoteBConnection: api.IConnection = {
    host: connection.host,
    headers: { ...connection.headers },
  };
  const adminBSuper = await authorize_super_administrator_join(
    promoteBConnection,
    {
      body: {
        administrator_id: adminB.id,
      },
    },
  );
  typia.assert(adminBSuper);
  // 5. Admin B (as super admin) retrieves Admin A's administrator profile
  const adminBQueryConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminBSuper.token.access,
    },
  };
  const retrieved =
    await api.functional.eCommerceMall.superAdministrator.administrators.at(
      adminBQueryConnection,
      {
        administratorId: adminA.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate response
  TestValidator.equals("administrator id", retrieved.id, adminA.id);
  TestValidator.equals("administrator email", retrieved.email, adminA.email);
  TestValidator.equals("grade field is super", retrieved.grade, "super");
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}
