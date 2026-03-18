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

export async function test_api_employee_refresh_rotated_token_reuse_rejected(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingEmployee.IJoin,
    });
  typia.assert(joined);
  const originalToken: IAuthorizationToken = joined.token;
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshed: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_refresh(firstRefreshConnection, {
      body: {
        refresh: originalToken.refresh,
      } satisfies IHrmTimeTrackingEmployee.IRefresh,
    });
  typia.assert(firstRefreshed);
  TestValidator.equals(
    "employee id remains same after first refresh",
    firstRefreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "employee email remains same after first refresh",
    firstRefreshed.email,
    joined.email,
  );
  TestValidator.notEquals(
    "refresh token rotates after successful refresh",
    firstRefreshed.token.refresh,
    originalToken.refresh,
  );
  const staleRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "stale original refresh token is rejected",
    401,
    async () => {
      await authorize_employee_refresh(staleRefreshConnection, {
        body: {
          refresh: originalToken.refresh,
        } satisfies IHrmTimeTrackingEmployee.IRefresh,
      });
    },
  );
  const latestRefreshConnection: api.IConnection = { host: connection.host };
  const latestRefreshed: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_refresh(latestRefreshConnection, {
      body: {
        refresh: firstRefreshed.token.refresh,
      } satisfies IHrmTimeTrackingEmployee.IRefresh,
    });
  typia.assert(latestRefreshed);
  TestValidator.equals(
    "employee id remains same with latest token",
    latestRefreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "employee email remains same with latest token",
    latestRefreshed.email,
    joined.email,
  );
  TestValidator.notEquals(
    "latest successful refresh issues a newer refresh token",
    latestRefreshed.token.refresh,
    firstRefreshed.token.refresh,
  );
}
