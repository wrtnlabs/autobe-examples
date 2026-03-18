import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_refresh_actor_scope_mismatch_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_owner_join(ownerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuthorized);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(employeeAuthorized);
  const ownerRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "owner refresh rejects employee refresh token",
    [401, 403],
    async () => {
      try {
        await authorize_owner_refresh(ownerRefreshConnection, {
          body: {
            refresh: employeeAuthorized.token.refresh,
          } satisfies IHrmTimeTrackingOwner.IRefresh,
        });
      } catch (exp) {
        const error = typia.assert<api.HttpError>(exp);
        TestValidator.predicate(
          "error status is authentication failure",
          error.status === 401 || error.status === 403,
        );
        const serialized = JSON.stringify(error.toJSON());
        const lowered = serialized.toLowerCase();
        TestValidator.predicate(
          "error does not expose internal token validation details",
          lowered.includes("jwt") === false &&
            lowered.includes("signature") === false &&
            lowered.includes("secret") === false &&
            lowered.includes("claim") === false &&
            lowered.includes("stack") === false &&
            lowered.includes("token validation") === false,
        );
        throw error;
      }
    },
  );
  TestValidator.equals(
    "failed refresh does not set owner authorization header",
    ownerRefreshConnection.headers?.Authorization,
    undefined,
  );
}
