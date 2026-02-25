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

export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration via join dependency
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate join input with random valid email and password
  const joinInput: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  // Perform administrator join via utility function
  const joinedAdmin = await authorize_administrator_join(connection, {
    body: joinInput,
  });
  typia.assert(joinedAdmin);
  // 2. Administrator login with same email and password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput: IShoppingMallAdministrator.ILogin = {
    email: joinInput.email,
    password: joinInput.password,
  };
  // Use authorize_administrator_login utility function
  const loggedInAdmin = await authorize_administrator_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loggedInAdmin);
  // 3. Validate returned token properties
  TestValidator.predicate(
    "access token present",
    typeof loggedInAdmin.token.access === "string" &&
      loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof loggedInAdmin.token.refresh === "string" &&
      loggedInAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date",
    !isNaN(Date.parse(loggedInAdmin.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date",
    !isNaN(Date.parse(loggedInAdmin.token.refreshable_until)),
  );
  // 4. Validate administrator profile fields
  TestValidator.predicate(
    "id is UUID string",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      loggedInAdmin.id,
    ),
  );
  TestValidator.equals(
    "email matches login",
    loggedInAdmin.email,
    joinInput.email,
  );
  TestValidator.predicate(
    "name is non-empty string",
    typeof loggedInAdmin.name === "string" && loggedInAdmin.name.length > 0,
  );
  TestValidator.predicate(
    "isSuperAdmin is boolean",
    typeof loggedInAdmin.isSuperAdmin === "boolean",
  );
  // Validate dates
  TestValidator.predicate(
    "createdAt is valid ISO date",
    !isNaN(Date.parse(loggedInAdmin.createdAt)),
  );
  if (loggedInAdmin.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is valid ISO date or null",
      loggedInAdmin.deletedAt === null ||
        !isNaN(Date.parse(loggedInAdmin.deletedAt)),
    );
  } else {
    TestValidator.equals("deletedAt is null", loggedInAdmin.deletedAt, null);
  }
  TestValidator.predicate(
    "updatedAt is valid ISO date",
    !isNaN(Date.parse(loggedInAdmin.updatedAt)),
  );
  // 5. Validate administratorGrade summary fields
  const grade = loggedInAdmin.administratorGrade;
  TestValidator.predicate(
    "administratorGrade.id is UUID string",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      grade.id,
    ),
  );
  TestValidator.predicate(
    "administratorGrade.name is non-empty string",
    typeof grade.name === "string" && grade.name.length > 0,
  );
  TestValidator.predicate(
    "administratorGrade.grade is a number",
    typeof grade.grade === "number",
  );
  TestValidator.predicate(
    "administratorGrade.superAdministrator is boolean",
    typeof grade.superAdministrator === "boolean",
  );
}
