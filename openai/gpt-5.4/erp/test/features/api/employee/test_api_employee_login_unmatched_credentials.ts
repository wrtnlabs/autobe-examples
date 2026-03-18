import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";

export async function test_api_employee_login_unmatched_credentials(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const wrongPassword = RandomGenerator.alphaNumeric(20);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  TestValidator.notEquals(
    "wrong password differs from registered password",
    wrongPassword,
    password,
  );
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const joined = await authorize_employee_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals("joined email matches input", joined.email, email);
  TestValidator.predicate(
    "join connection has authorization after successful join",
    typeof joinConnection.headers?.Authorization === "string" &&
      joinConnection.headers.Authorization.length > 0,
  );
  TestValidator.predicate(
    "join response access token is issued",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response refresh token is issued",
    joined.token.refresh.length > 0,
  );
  const failedLoginConnection: api.IConnection = { host: connection.host };
  const failedLoginBody = {
    email,
    password: wrongPassword,
    href,
    referrer,
    ip,
  } satisfies IHrmTimeTrackingEmployee.ILogin;
  await TestValidator.error("login rejects unmatched password", async () => {
    await authorize_employee_login(failedLoginConnection, {
      body: failedLoginBody,
    });
  });
  TestValidator.equals(
    "failed login does not activate authorization header",
    failedLoginConnection.headers?.Authorization,
    undefined,
  );
  const validLoginConnection: api.IConnection = { host: connection.host };
  const validLoginBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IHrmTimeTrackingEmployee.ILogin;
  const loggedIn = await authorize_employee_login(validLoginConnection, {
    body: validLoginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals("logged in email matches input", loggedIn.email, email);
  TestValidator.predicate(
    "valid login connection has authorization after success",
    typeof validLoginConnection.headers?.Authorization === "string" &&
      validLoginConnection.headers.Authorization.length > 0,
  );
  TestValidator.predicate(
    "valid login access token is issued",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "valid login refresh token is issued",
    loggedIn.token.refresh.length > 0,
  );
}
