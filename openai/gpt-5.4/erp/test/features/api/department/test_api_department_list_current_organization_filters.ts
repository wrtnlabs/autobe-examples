import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_department_list_current_organization_filters(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const request = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    isTopLevel: true,
    sort: "+name",
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const firstPage =
    await api.functional.hrmTimeTracking.owner.departments.index(
      ownerConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.hrmTimeTracking.owner.departments.index(
      ownerConnection,
      {
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination current page matches request",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "repeated pagination current page matches request",
    secondPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "repeated pagination limit matches request",
    secondPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "returned data length does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "repeated returned data length does not exceed limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "repeated record count is non-negative",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "repeated page count is non-negative",
    secondPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "zero pages implies zero records",
    firstPage.pagination.pages !== 0 || firstPage.pagination.records === 0,
  );
  TestValidator.predicate(
    "repeated zero pages implies zero records",
    secondPage.pagination.pages !== 0 || secondPage.pagination.records === 0,
  );
  for (const department of firstPage.data) {
    typia.assert(department);
    TestValidator.equals(
      "department is active in ordinary browsing results",
      department.deleted_at,
      null,
    );
    TestValidator.predicate(
      "department name is present for list rendering",
      department.name.length > 0,
    );
    TestValidator.predicate(
      "department description is nullable text",
      department.description === null ||
        typeof department.description === "string",
    );
  }
  for (const department of secondPage.data) {
    typia.assert(department);
    TestValidator.equals(
      "repeated department is active in ordinary browsing results",
      department.deleted_at,
      null,
    );
    TestValidator.predicate(
      "repeated department name is present for list rendering",
      department.name.length > 0,
    );
    TestValidator.predicate(
      "repeated department description is nullable text",
      department.description === null ||
        typeof department.description === "string",
    );
  }
  const firstIds = firstPage.data.map((department) => department.id);
  const secondIds = secondPage.data.map((department) => department.id);
  TestValidator.equals(
    "repeated filtered navigation returns stable ordering",
    firstIds,
    secondIds,
  );
}
