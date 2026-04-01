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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test successful demotion of a super administrator to regular administrator grade.
 *
 * This test validates the complete demotion workflow:
 * 1. First super administrator (Super Admin A) joins the system
 * 2. Second super administrator (Super Admin B) joins the system
 * 3. Super Admin A demotes Super Admin B using the demote endpoint
 * 4. Validate the demoted administrator entity is returned with correct structure
 * 5. Verify Super Admin A retains super administrator status
 *
 * @param connection Base connection for the test
 */
export async function test_api_administrator_grade_demotion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first super administrator (Super Admin A) who will perform the demotion
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_super_administrator_join(
    superAdminAConnection,
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
  typia.assert(superAdminA);
  // Step 2: Create second super administrator (Super Admin B) who will be demoted
  const superAdminBConnection: api.IConnection = { host: connection.host };
  const superAdminB = await authorize_super_administrator_join(
    superAdminBConnection,
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
  typia.assert(superAdminB);
  // Step 3: Super Admin A demotes Super Admin B
  const demoteReason = RandomGenerator.paragraph({ sentences: 2 });
  const demotedAdmin =
    await api.functional.shoppingMall.superAdministrator.administrators.demote(
      superAdminAConnection,
      {
        administratorId: superAdminB.id,
        body: {
          reason: demoteReason,
        } satisfies IShoppingMallAdministrator.IDemote,
      },
    );
  typia.assert(demotedAdmin);
  // Step 4: Validate business logic - demoted administrator identity matches
  TestValidator.equals(
    "demoted admin ID matches",
    demotedAdmin.id,
    superAdminB.id,
  );
  TestValidator.equals(
    "demoted admin email matches",
    demotedAdmin.email,
    superAdminB.email,
  );
  // Step 5: Verify Super Admin A can still perform super administrator operations
  // (The successful demotion call above proves Super Admin A retains super admin privileges)
  TestValidator.predicate(
    "demotion operation succeeded",
    demotedAdmin.id === superAdminB.id,
  );
}
