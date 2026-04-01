import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
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
 * Test the last super administrator protection mechanism.
 *
 * This test validates that the system prevents demotion operations that would
 * compromise super administrator oversight. The system must ensure at least one
 * super administrator always exists.
 *
 * Test scenarios:
 * 1. Create two super administrators and one regular administrator
 * 2. First super admin demotes second super admin (succeeds - one remains)
 * 3. Remaining super admin attempts self-demotion (fails - self-demotion prohibited)
 * 4. Attempt to demote regular administrator (fails - not a super admin)
 */
export async function test_api_administrator_grade_last_super_admin_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_administrator_join(
    superAdmin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin1);
  // 2. Create second super administrator
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_super_administrator_join(
    superAdmin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin2);
  // 3. Create a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(regularAdmin);
  // 4. Super Admin 1 demotes Super Admin 2 (should succeed - one super admin remains)
  const demoteResult =
    await api.functional.shoppingMall.superAdministrator.administrators.demote(
      superAdmin1Connection,
      {
        administratorId: superAdmin2.id,
        body: {
          reason: "Test demotion - one super admin remains",
        } satisfies IShoppingMallAdministrator.IDemote,
      },
    );
  typia.assert(demoteResult);
  TestValidator.equals("demoted admin ID", demoteResult.id, superAdmin2.id);
  // 5. Attempt self-demotion (should fail - self-demotion prohibited)
  await TestValidator.error("self-demotion prohibited", async () => {
    await api.functional.shoppingMall.superAdministrator.administrators.demote(
      superAdmin1Connection,
      {
        administratorId: superAdmin1.id,
        body: {
          reason: "Self-demotion attempt",
        } satisfies IShoppingMallAdministrator.IDemote,
      },
    );
  });
  // 6. Attempt to demote regular administrator (should fail - not a super admin)
  await TestValidator.error("demote regular admin fails", async () => {
    await api.functional.shoppingMall.superAdministrator.administrators.demote(
      superAdmin1Connection,
      {
        administratorId: regularAdmin.id,
        body: {
          reason: "Attempting to demote non-super-admin",
        } satisfies IShoppingMallAdministrator.IDemote,
      },
    );
  });
}
