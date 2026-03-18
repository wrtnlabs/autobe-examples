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

export async function test_api_employee_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  const emailLocal = `employee.${RandomGenerator.alphabets(8)}`;
  const emailDomain = `example-${RandomGenerator.alphabets(5)}.com`;
  const primaryEmail = `${emailLocal}@${emailDomain}` as string &
    tags.Format<"email">;
  const duplicateEmail =
    `${emailLocal.toUpperCase()}@${emailDomain.toUpperCase()}` as string &
      tags.Format<"email">;
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_employee_join(firstConnection, {
    body: {
      email: primaryEmail,
    },
  });
  typia.assert(firstAuthorized);
  TestValidator.equals(
    "registered email represents the same normalized identity",
    firstAuthorized.email.toLowerCase(),
    primaryEmail.toLowerCase(),
  );
  TestValidator.equals(
    "registered account is active",
    firstAuthorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "authorization access token exists after successful join",
    firstAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization refresh token exists after successful join",
    firstAuthorized.token.refresh.length > 0,
  );
  TestValidator.equals(
    "successful join updates first connection authorization header",
    firstConnection.headers?.Authorization,
    firstAuthorized.token.access,
  );
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate employee join with normalized email identity is rejected",
    [400, 409, 422],
    async () => {
      await authorize_employee_join(secondConnection, {
        body: {
          email: duplicateEmail,
        },
      });
    },
  );
  TestValidator.equals(
    "rejected duplicate join does not set authorization header on fresh connection",
    secondConnection.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "original successful connection remains authorized",
    firstConnection.headers?.Authorization,
    firstAuthorized.token.access,
  );
  TestValidator.equals(
    "original employee account remains active after duplicate rejection",
    firstAuthorized.deleted_at,
    null,
  );
}
