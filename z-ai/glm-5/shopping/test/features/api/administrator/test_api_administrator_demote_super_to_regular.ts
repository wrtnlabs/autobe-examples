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
 * Test successful demotion of a super administrator by another super administrator.
 *
 * Setup steps:
 * 1. Create a super administrator account (first admin acts as super admin)
 * 2. Create a second administrator account via join endpoint
 * 3. Promote the second administrator to super administrator grade
 * 4. Verify the second administrator now has 'super' grade
 *
 * Test execution:
 * 1. Call the demote endpoint targeting the second super administrator
 * 2. Verify the response returns the updated administrator record
 * 3. Confirm the grade has been changed from 'super' to 'regular'
 * 4. Verify the updated_at timestamp has been modified
 * 5. Verify the second administrator loses access to super admin-only functions
 */
export async function test_api_administrator_demote_super_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first administrator (acting as super admin for operations)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(superAdminConnection, {});
  // 2. Create second administrator to be promoted and demoted
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_administrator_join(
    secondAdminConnection,
    {},
  );
  typia.assert(secondAdmin);
  TestValidator.equals(
    "initial grade is regular",
    secondAdmin.grade,
    "regular",
  );
  // 3. Promote second administrator to super grade
  const promotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.promote(
      superAdminConnection,
      {
        administratorId: secondAdmin.id,
        body: {
          confirmation: true,
        } satisfies IShoppingMallAdministrator.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  TestValidator.equals("promoted to super", promotedAdmin.grade, "super");
  // 4. Demote back to regular grade
  const timestampBeforeDemotion = promotedAdmin.updated_at;
  const demotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.demote(
      superAdminConnection,
      {
        administratorId: secondAdmin.id,
      },
    );
  typia.assert(demotedAdmin);
  // 5. Verify demotion results
  TestValidator.equals("demoted to regular", demotedAdmin.grade, "regular");
  TestValidator.equals(
    "same administrator ID",
    demotedAdmin.id,
    secondAdmin.id,
  );
  TestValidator.notEquals(
    "updated_at modified",
    demotedAdmin.updated_at,
    timestampBeforeDemotion,
  );
  // 6. Verify demoted admin cannot perform super admin functions
  await TestValidator.error("demoted admin cannot promote others", async () => {
    const thirdAdminConnection: api.IConnection = { host: connection.host };
    const thirdAdmin = await authorize_administrator_join(
      thirdAdminConnection,
      {},
    );
    await api.functional.shoppingMall.administrator.administrators.promote(
      secondAdminConnection,
      {
        administratorId: thirdAdmin.id,
        body: {
          confirmation: true,
        } satisfies IShoppingMallAdministrator.IPromote,
      },
    );
  });
}
