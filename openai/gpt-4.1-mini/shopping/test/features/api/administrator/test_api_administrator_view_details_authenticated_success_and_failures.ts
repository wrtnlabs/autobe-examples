import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_administrator_view_details_authenticated_success_and_failures(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Join new administrator
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // Setup adminConnection authorization header
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // Fetch administrator details with valid administratorId
  const gotAdmin =
    await api.functional.shoppingMall.administrator.administrators.at(
      adminConnection,
      {
        administratorId: adminAuthorized.id,
      },
    );
  typia.assert(gotAdmin);
  // Validate response fields
  TestValidator.equals(
    "administrator id matches",
    gotAdmin.id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "administrator email matches",
    gotAdmin.email,
    adminJoinBody.email,
  );
  TestValidator.equals(
    "administrator name exists",
    typeof gotAdmin.name,
    "string",
  );
  TestValidator.predicate(
    "administrator isSuperAdmin flag is boolean",
    typeof gotAdmin.isSuperAdmin === "boolean",
  );
  TestValidator.predicate(
    "administrator createdAt is valid ISO date",
    !isNaN(Date.parse(gotAdmin.createdAt)),
  );
  TestValidator.predicate(
    "administrator updatedAt is valid ISO date",
    !isNaN(Date.parse(gotAdmin.updatedAt)),
  );
  TestValidator.predicate(
    "administrator deletedAt is null or valid ISO date",
    gotAdmin.deletedAt === null || !isNaN(Date.parse(gotAdmin.deletedAt)),
  );
  // Validate administratorGrade summary
  TestValidator.equals(
    "administratorGrade id has uuid format",
    /^[0-9a-f-]{36}$/.test(gotAdmin.administratorGrade.id),
    true,
  );
  TestValidator.predicate(
    "administratorGrade name is string",
    typeof gotAdmin.administratorGrade.name === "string",
  );
  TestValidator.predicate(
    "administratorGrade grade is number",
    typeof gotAdmin.administratorGrade.grade === "number",
  );
  TestValidator.predicate(
    "administratorGrade superAdministrator is boolean",
    typeof gotAdmin.administratorGrade.superAdministrator === "boolean",
  );
  // 2. Attempt retrieval with invalid administratorId (random UUID not existing)
  const invalidUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve invalid administrator id",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrators.at(
        adminConnection,
        {
          administratorId: invalidUUID,
        },
      );
    },
  );
  // 3. Authorization failure: unauthenticated user
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.administrators.at(
        unauthConnection,
        {
          administratorId: adminAuthorized.id,
        },
      );
    },
  );
  // 4. Authorization failure: authenticated user but not administrator
  // For this scenario, simulate a user connection with no admin token
  // Attempt access expecting 401 or 403 error
  // Here we just reuse unauthConnection (no token), indicates non-admin
  // Because no user auth utility is given, we can't authenticate as non-admin.
  await TestValidator.httpError("non-admin access", [401, 403], async () => {
    await api.functional.shoppingMall.administrator.administrators.at(
      unauthConnection,
      {
        administratorId: adminAuthorized.id,
      },
    );
  });
}
