import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_employee_directory_current_organization_only(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const body = {
    search: "organization-scope-check",
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingEmployee.IRequest;
  const page = await api.functional.hrmTimeTracking.employees.index(
    employeeConnection,
    {
      body,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "requested current page is reflected",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested page limit is reflected",
    page.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "returned records do not exceed requested limit",
    page.data.length <= body.limit,
  );
  TestValidator.predicate(
    "pagination record count is not less than returned data length",
    page.pagination.records >= page.data.length,
  );
}
