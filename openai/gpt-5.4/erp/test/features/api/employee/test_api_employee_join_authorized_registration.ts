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

export async function test_api_employee_join_authorized_registration(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const localPart = `employee.${RandomGenerator.alphabets(6)}.${RandomGenerator.alphabets(6)}`;
  const joinInput = {
    email: `${localPart}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: `https://app.example.com/join/${RandomGenerator.alphabets(8)}`,
    referrer: `https://www.example.com/ref/${RandomGenerator.alphabets(8)}`,
    ip: "203.0.113.10",
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const authorized = await authorize_employee_join(employeeConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "registered email matches input",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals(
    "email is not yet verified on join",
    authorized.email_verified_at,
    null,
  );
  TestValidator.equals(
    "last logged in remains null on join",
    authorized.last_logged_in_at,
    null,
  );
  TestValidator.equals(
    "active account is not deleted",
    authorized.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "access and refresh tokens differ",
    authorized.token.access,
    authorized.token.refresh,
  );
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshable deadline is not earlier than access expiration",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
  typia.assert(authorized.role);
  typia.assert(authorized.role.organization);
  if (authorized.department !== null) {
    typia.assert(authorized.department);
  }
  TestValidator.equals(
    "connection authorization header updated from join token",
    employeeConnection.headers?.Authorization,
    authorized.token.access,
  );
}
