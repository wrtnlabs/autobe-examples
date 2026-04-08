import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the primary success path where a super administrator demotes another super administrator to regular grade.
 *
 * Validates the administrator grade demotion workflow where a super administrator reduces the privilege level of another super administrator. The test ensures that the grade change from 'super' to 'regular' is properly executed, the target administrator retains all regular administrator capabilities, and the response contains the updated administrator record with correct grade and timestamps.
 *
 * Special attention is given to verifying that the demoted administrator maintains a valid account state (not banned, not deleted) and that the updated_at timestamp reflects the recent modification.
 *
 * 1. Create and authenticate as Super Admin A (calling admin who will perform demotion).
 * 2. Create and authenticate as Super Admin B (target administrator to be demoted).
 * 3. Super Admin A calls the demote endpoint with Super Admin B's ID.
 * 4. Verify the response returns the updated administrator record with grade='regular'.
 * 5. Verify the demoted administrator retains valid account state (banned=false, deleted_at=null).
 * 6. Verify the updated_at timestamp is recent (within test execution timeframe).
 */
export async function test_api_administrator_demote_super_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Super Admin A (calling admin)
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_administrator_join(
    superAdminAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(superAdminA);
  // Simulate promotion of Super Admin A to super grade (in real scenario, another super admin would do this)
  // For E2E testing, we assume the system has a way to promote this admin to super
  const promotedSuperAdminA =
    await api.functional.shoppingMall.administrator.administrators.promote(
      superAdminAConnection,
      {
        administratorId: superAdminA.id,
      },
    );
  typia.assert(promotedSuperAdminA);
  TestValidator.equals(
    "Super Admin A promoted to super",
    promotedSuperAdminA.grade,
    "super",
  );
  // 2. Create Super Admin B (target to demote)
  const superAdminBConnection: api.IConnection = { host: connection.host };
  const superAdminB = await authorize_administrator_join(
    superAdminBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(superAdminB);
  // Promote Super Admin B to super grade using Super Admin A
  const promotedSuperAdminB =
    await api.functional.shoppingMall.administrator.administrators.promote(
      superAdminAConnection,
      {
        administratorId: superAdminB.id,
      },
    );
  typia.assert(promotedSuperAdminB);
  TestValidator.equals(
    "Super Admin B promoted to super",
    promotedSuperAdminB.grade,
    "super",
  );
  // 3. Super Admin A demotes Super Admin B to regular grade
  const demotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.demote(
      superAdminAConnection,
      {
        administratorId: superAdminB.id,
      },
    );
  typia.assert(demotedAdmin);
  // 4. Verify the response contains grade='regular'
  TestValidator.equals(
    "demoted administrator grade is regular",
    demotedAdmin.grade,
    "regular",
  );
  // 5. Verify the demoted administrator retains valid account state
  TestValidator.equals(
    "demoted administrator not banned",
    demotedAdmin.banned,
    false,
  );
  TestValidator.equals(
    "demoted administrator not deleted",
    demotedAdmin.deleted_at,
    null,
  );
  // 6. Verify the updated_at timestamp is recent (within last 1 minute)
  const updatedAt = new Date(demotedAdmin.updated_at);
  const now = new Date();
  const timeDiff = Math.abs(now.getTime() - updatedAt.getTime());
  TestValidator.predicate(
    "updated_at timestamp is recent (within 1 minute)",
    timeDiff < 60000,
  );
  // 7. Verify the administrator ID matches
  TestValidator.equals(
    "administrator ID matches",
    demotedAdmin.id,
    superAdminB.id,
  );
  // 8. Verify the email matches
  TestValidator.equals("email matches", demotedAdmin.email, superAdminB.email);
}
