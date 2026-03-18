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

export async function test_api_employee_refresh_active_session(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_employee_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined employee starts active",
    joined.deleted_at,
    null,
  );
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_employee_refresh(refreshConnection, {
    body: {
      refresh: joined.token.refresh,
    } satisfies IHrmTimeTrackingEmployee.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("employee id is preserved", refreshed.id, joined.id);
  TestValidator.equals(
    "employee email is preserved",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "active employee remains not deleted",
    refreshed.deleted_at,
    null,
  );
  TestValidator.equals(
    "role id is preserved",
    refreshed.role.id,
    joined.role.id,
  );
  TestValidator.equals(
    "organization id is preserved",
    refreshed.role.organization.id,
    joined.role.organization.id,
  );
  if (joined.department === null || refreshed.department === null) {
    TestValidator.equals(
      "department nullable state is preserved",
      refreshed.department,
      joined.department,
    );
  } else {
    TestValidator.equals(
      "department id is preserved",
      refreshed.department.id,
      joined.department.id,
    );
  }
  TestValidator.notEquals(
    "access token is refreshed",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  TestValidator.notEquals(
    "access expiry metadata is refreshed",
    refreshed.token.expired_at,
    joined.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable until metadata is refreshed",
    refreshed.token.refreshable_until,
    joined.token.refreshable_until,
  );
}
