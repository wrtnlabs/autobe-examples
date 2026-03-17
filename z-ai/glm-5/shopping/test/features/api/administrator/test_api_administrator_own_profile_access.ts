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
 * Test that an administrator can retrieve their own profile information.
 *
 * Steps:
 * 1. Create and authenticate as administrator via join endpoint
 * 2. Retrieve the administrator's own profile by their ID
 * 3. Validate that the profile matches the authenticated administrator data
 */
export async function test_api_administrator_own_profile_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Retrieve administrator's own profile using their ID
  const profile =
    await api.functional.shoppingMall.administrator.administrators.at(
      adminConnection,
      {
        administratorId: authorized.id,
      },
    );
  typia.assert(profile);
  // 3. Validate response matches the authenticated administrator
  TestValidator.equals("id matches", profile.id, authorized.id);
  TestValidator.equals("email matches", profile.email, authorized.email);
  TestValidator.equals("grade is regular", profile.grade, "regular");
  TestValidator.predicate("created_at is present", !!profile.created_at);
  TestValidator.predicate("updated_at is present", !!profile.updated_at);
}
