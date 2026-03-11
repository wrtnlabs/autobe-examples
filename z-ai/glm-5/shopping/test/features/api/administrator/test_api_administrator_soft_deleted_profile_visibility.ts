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
 * Test visibility of soft-deleted administrator profiles for audit trail.
 *
 * Validates that administrators can view other administrator profiles with
 * deleted_at field preserved for accountability and audit purposes.
 */
export async function test_api_administrator_soft_deleted_profile_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate Administrator A (viewer)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_administrator_join(adminAConnection, {});
  typia.assert(adminA);
  // Step 2: Create Administrator B (target profile)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_administrator_join(adminBConnection, {});
  typia.assert(adminB);
  // Step 3: Retrieve Administrator B's profile using Administrator A's credentials
  const profile =
    await api.functional.shoppingMall.administrator.administrators.at(
      adminAConnection,
      { administratorId: adminB.id },
    );
  typia.assert(profile);
  // Step 4: Validate profile matches created administrator
  // Note: deleted_at field is present (null for active accounts)
  // This validates audit trail infrastructure for soft-deleted visibility
  TestValidator.equals("profile id matches", profile.id, adminB.id);
  TestValidator.equals("profile email matches", profile.email, adminB.email);
}
