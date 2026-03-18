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

export async function test_api_employee_login_deleted_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16) satisfies string as string &
    tags.Format<"password">;
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
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
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IHrmTimeTrackingEmployee.ILogin;
  const loggedIn = await authorize_employee_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "joined email matches login email",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "employee identity remains consistent",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "login request email is persisted",
    loggedIn.email,
    email,
  );
  TestValidator.notEquals(
    "join and login access tokens differ",
    loggedIn.token.access,
    joined.token.access,
  );
}
