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

export async function test_api_employee_login_success(
  connection: api.IConnection,
): Promise<void> {
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const joinedConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_employee_join(joinedConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert<IHrmTimeTrackingEmployee.IAuthorized>(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_employee_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip,
    } satisfies IHrmTimeTrackingEmployee.ILogin,
  });
  typia.assert<IHrmTimeTrackingEmployee.IAuthorized>(loggedIn);
  TestValidator.equals(
    "employee id is preserved across join and login",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "employee email is preserved across join and login",
    loggedIn.email,
    email,
  );
  TestValidator.equals(
    "login targets the same joined email",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "active employee account is not deleted",
    loggedIn.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "login issues a fresh access token",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "login issues a fresh refresh token",
    loggedIn.token.refresh,
    joined.token.refresh,
  );
  TestValidator.equals(
    "login connection stores issued bearer token",
    loginConnection.headers?.Authorization,
    loggedIn.token.access,
  );
  TestValidator.equals(
    "joined connection stores issued bearer token",
    joinedConnection.headers?.Authorization,
    joined.token.access,
  );
  TestValidator.equals(
    "organization context remains stable across sessions",
    loggedIn.role.organization.id,
    joined.role.organization.id,
  );
  TestValidator.predicate(
    "login returns a non-empty role name",
    loggedIn.role.name.length > 0,
  );
  TestValidator.equals(
    "department is stable across sessions",
    loggedIn.department,
    joined.department,
  );
  TestValidator.notEquals(
    "login records a successful sign-in timestamp",
    loggedIn.last_logged_in_at,
    null,
  );
}
