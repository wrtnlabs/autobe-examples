import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_department_list_current_organization_browse(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 10,
    sort: "+name",
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const page = await api.functional.hrmTimeTracking.manager.departments.index(
    managerConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "returned department count does not exceed requested limit",
    page.data.length <= request.limit,
  );
  TestValidator.predicate(
    "total records covers current page result length",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    page.pagination.pages >= 0,
  );
  if (page.pagination.records === 0) {
    TestValidator.equals(
      "empty records produce empty data",
      page.data.length,
      0,
    );
  }
  for (const department of page.data) {
    TestValidator.equals(
      "department is active in normal list",
      department.deleted_at,
      null,
    );
    TestValidator.predicate(
      "department name is non-empty",
      department.name.length > 0,
    );
    TestValidator.predicate(
      "department description is nullable string",
      department.description === null ||
        typeof department.description === "string",
    );
  }
}
