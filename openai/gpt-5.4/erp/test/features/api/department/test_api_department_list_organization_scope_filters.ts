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

export async function test_api_department_list_organization_scope_filters(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const baselineRequest = {
    page: 1,
    limit: 100,
    sort: "+name",
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const baseline =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: baselineRequest,
      },
    );
  typia.assert(baseline);
  TestValidator.equals(
    "baseline current page matches request",
    baseline.pagination.current,
    1,
  );
  TestValidator.equals(
    "baseline page limit matches request",
    baseline.pagination.limit,
    100,
  );
  baseline.data.forEach((department) => {
    TestValidator.equals(
      "baseline excludes soft-deleted departments",
      department.deleted_at,
      null,
    );
  });
  const sampled = baseline.data[0];
  const searchKeyword =
    sampled !== undefined
      ? sampled.name.slice(0, Math.max(1, Math.min(sampled.name.length, 3)))
      : RandomGenerator.alphabets(3);
  const descriptionKeyword =
    sampled !== undefined &&
    sampled.description !== null &&
    sampled.description.length > 0
      ? sampled.description.slice(
          0,
          Math.max(1, Math.min(sampled.description.length, 3)),
        )
      : RandomGenerator.alphabets(3);
  const searchRequest = {
    search: searchKeyword,
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const searched =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searched);
  TestValidator.equals(
    "search current page matches request",
    searched.pagination.current,
    1,
  );
  TestValidator.equals(
    "search limit matches request",
    searched.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "search result count stays within baseline page size",
    searched.data.length <= baseline.data.length,
  );
  searched.data.forEach((department) => {
    TestValidator.equals(
      "search excludes soft-deleted departments",
      department.deleted_at,
      null,
    );
  });
  const nameRequest = {
    name: sampled?.name ?? RandomGenerator.alphabets(8),
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const named = await api.functional.hrmTimeTracking.manager.departments.index(
    managerConnection,
    {
      body: nameRequest,
    },
  );
  typia.assert(named);
  named.data.forEach((department) => {
    TestValidator.equals(
      "name filter excludes soft-deleted departments",
      department.deleted_at,
      null,
    );
  });
  const descriptionRequest = {
    description: descriptionKeyword,
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const described =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: descriptionRequest,
      },
    );
  typia.assert(described);
  described.data.forEach((department) => {
    TestValidator.equals(
      "description filter excludes soft-deleted departments",
      department.deleted_at,
      null,
    );
  });
  const foreignParentDepartmentId = typia.random<
    string & tags.Format<"uuid">
  >();
  const foreignParentRequest = {
    parentDepartmentId: foreignParentDepartmentId,
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const foreignParentResult =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: foreignParentRequest,
      },
    );
  typia.assert(foreignParentResult);
  foreignParentResult.data.forEach((department) => {
    TestValidator.notEquals(
      "foreign parent filter does not leak the probed external department id",
      department.id,
      foreignParentDepartmentId,
    );
    TestValidator.equals(
      "foreign parent filter excludes soft-deleted departments",
      department.deleted_at,
      null,
    );
  });
  const topLevelRequest = {
    isTopLevel: true,
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const topLevel =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: topLevelRequest,
      },
    );
  typia.assert(topLevel);
  topLevel.data.forEach((department) => {
    TestValidator.equals(
      "top-level filter excludes soft-deleted departments",
      department.deleted_at,
      null,
    );
  });
  const childLevelRequest = {
    isTopLevel: false,
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const childLevel =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: childLevelRequest,
      },
    );
  typia.assert(childLevel);
  childLevel.data.forEach((department) => {
    TestValidator.equals(
      "child-level filter excludes soft-deleted departments",
      department.deleted_at,
      null,
    );
  });
}
