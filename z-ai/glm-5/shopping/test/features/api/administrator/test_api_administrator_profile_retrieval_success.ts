import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create administrator connection and authenticate
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Test: Retrieve administrator profile by ID
  const profile =
    await api.functional.shoppingMall.administrator.administrators.at(
      administratorConnection,
      {
        administratorId: authorized.id,
      },
    );
  typia.assert(profile);
  // 3. Validate: Business logic assertions
  TestValidator.equals(
    "profile id matches authenticated administrator",
    profile.id,
    authorized.id,
  );
  TestValidator.equals("email matches", profile.email, authorized.email);
  TestValidator.equals("grade matches", profile.grade, authorized.grade);
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
