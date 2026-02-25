import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Scenario: Test logging in an existing administrator with valid credentials
  // Step 1: Prepare a random password
  const password = RandomGenerator.alphaNumeric(16);
  // Step 2: Register a new administrator to ensure one exists
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password,
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const joinedAdmin = await authorize_administrator_join(adminJoinConnection, {
    body: joinInput,
  });
  typia.assert(joinedAdmin);
  // Step 3: Login as the registered administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password,
    href: "http://localhost/login",
    referrer: "http://localhost/",
  } satisfies IDiscussionBoardAdministrator.ILogin;
  const loggedInAdmin = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: loginInput,
    },
  );
  typia.assert(loggedInAdmin);
  // Step 4: Validate the login response
  TestValidator.predicate(
    "access token is non-empty string",
    typeof loggedInAdmin.token.access === "string" &&
      loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof loggedInAdmin.token.refresh === "string" &&
      loggedInAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at format is valid date-time string",
    typeof loggedInAdmin.token.expired_at === "string" &&
      !isNaN(Date.parse(loggedInAdmin.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until format is valid date-time string",
    typeof loggedInAdmin.token.refreshable_until === "string" &&
      !isNaN(Date.parse(loggedInAdmin.token.refreshable_until)),
  );
  TestValidator.predicate(
    "administrator id is UUID string",
    typeof loggedInAdmin.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        loggedInAdmin.id,
      ),
  );
  TestValidator.equals(
    "administrator email matches login input",
    loggedInAdmin.email,
    loginInput.email,
  );
  TestValidator.predicate(
    "createdAt is date-time string",
    typeof loggedInAdmin.createdAt === "string" &&
      !isNaN(Date.parse(loggedInAdmin.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is date-time string",
    typeof loggedInAdmin.updatedAt === "string" &&
      !isNaN(Date.parse(loggedInAdmin.updatedAt)),
  );
  TestValidator.equals("deletedAt is null", loggedInAdmin.deletedAt, null);
  // Grade is optional, if present check:
  if (loggedInAdmin.grade !== undefined) {
    TestValidator.predicate(
      "grade is object",
      typeof loggedInAdmin.grade === "object" && loggedInAdmin.grade !== null,
    );
  }
  TestValidator.predicate(
    "gradeId is UUID string",
    typeof loggedInAdmin.gradeId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        loggedInAdmin.gradeId,
      ),
  );
}
