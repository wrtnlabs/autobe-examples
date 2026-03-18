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

export async function test_api_department_list_organization_scope_isolated(
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
  const baselineRequest = {
    page: 1,
    limit: 20,
    sort: "+name",
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const baseline = await api.functional.hrmTimeTracking.owner.departments.index(
    ownerConnection,
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
    "baseline limit matches request",
    baseline.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "baseline data length stays within requested limit",
    baseline.data.length <= 20,
  );
  TestValidator.predicate(
    "baseline records are active",
    baseline.data.every((department) => department.deleted_at === null),
  );
  const sample = baseline.data[0];
  if (sample !== undefined) {
    const searchText = sample.name.slice(
      0,
      Math.max(1, Math.min(sample.name.length, 3)),
    );
    const searchRequest = {
      search: searchText,
      page: 1,
      limit: 20,
    } satisfies IHrmTimeTrackingDepartment.IRequest;
    const searched =
      await api.functional.hrmTimeTracking.owner.departments.index(
        ownerConnection,
        {
          body: searchRequest,
        },
      );
    typia.assert(searched);
    TestValidator.equals(
      "search response current page matches request",
      searched.pagination.current,
      1,
    );
    TestValidator.equals(
      "search response limit matches request",
      searched.pagination.limit,
      20,
    );
    TestValidator.predicate(
      "search results stay within requested limit",
      searched.data.length <= 20,
    );
    TestValidator.predicate(
      "search results stay active",
      searched.data.every((department) => department.deleted_at === null),
    );
    TestValidator.predicate(
      "search does not widen visible scope",
      searched.pagination.records <= baseline.pagination.records,
    );
    const nameRequest = {
      name: sample.name,
      page: 1,
      limit: 20,
    } satisfies IHrmTimeTrackingDepartment.IRequest;
    const named = await api.functional.hrmTimeTracking.owner.departments.index(
      ownerConnection,
      {
        body: nameRequest,
      },
    );
    typia.assert(named);
    TestValidator.equals(
      "name response current page matches request",
      named.pagination.current,
      1,
    );
    TestValidator.equals(
      "name response limit matches request",
      named.pagination.limit,
      20,
    );
    TestValidator.predicate(
      "name filtered data length stays within requested limit",
      named.data.length <= 20,
    );
    TestValidator.predicate(
      "name filter does not widen visible scope",
      named.pagination.records <= baseline.pagination.records,
    );
    TestValidator.predicate(
      "name filtered records stay active",
      named.data.every((department) => department.deleted_at === null),
    );
    if (sample.description !== null && sample.description.length > 0) {
      const descriptionKeyword = sample.description.slice(
        0,
        Math.max(1, Math.min(sample.description.length, 3)),
      );
      const descriptionRequest = {
        description: descriptionKeyword,
        page: 1,
        limit: 20,
      } satisfies IHrmTimeTrackingDepartment.IRequest;
      const described =
        await api.functional.hrmTimeTracking.owner.departments.index(
          ownerConnection,
          {
            body: descriptionRequest,
          },
        );
      typia.assert(described);
      TestValidator.equals(
        "description response current page matches request",
        described.pagination.current,
        1,
      );
      TestValidator.equals(
        "description response limit matches request",
        described.pagination.limit,
        20,
      );
      TestValidator.predicate(
        "description filtered data length stays within requested limit",
        described.data.length <= 20,
      );
      TestValidator.predicate(
        "description filter does not widen visible scope",
        described.pagination.records <= baseline.pagination.records,
      );
      TestValidator.predicate(
        "description filtered records stay active",
        described.data.every((department) => department.deleted_at === null),
      );
    }
  }
  const topLevelRequest = {
    isTopLevel: true,
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const topLevel = await api.functional.hrmTimeTracking.owner.departments.index(
    ownerConnection,
    {
      body: topLevelRequest,
    },
  );
  typia.assert(topLevel);
  TestValidator.equals(
    "top-level response current page matches request",
    topLevel.pagination.current,
    1,
  );
  TestValidator.equals(
    "top-level response limit matches request",
    topLevel.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "top-level data length stays within requested limit",
    topLevel.data.length <= 20,
  );
  TestValidator.predicate(
    "top-level filter does not widen visible scope",
    topLevel.pagination.records <= baseline.pagination.records,
  );
  TestValidator.predicate(
    "top-level results stay active",
    topLevel.data.every((department) => department.deleted_at === null),
  );
  const childRequest = {
    isTopLevel: false,
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const childDepartments =
    await api.functional.hrmTimeTracking.owner.departments.index(
      ownerConnection,
      {
        body: childRequest,
      },
    );
  typia.assert(childDepartments);
  TestValidator.equals(
    "child response current page matches request",
    childDepartments.pagination.current,
    1,
  );
  TestValidator.equals(
    "child response limit matches request",
    childDepartments.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "child data length stays within requested limit",
    childDepartments.data.length <= 20,
  );
  TestValidator.predicate(
    "child filter does not widen visible scope",
    childDepartments.pagination.records <= baseline.pagination.records,
  );
  TestValidator.predicate(
    "child results stay active",
    childDepartments.data.every((department) => department.deleted_at === null),
  );
}
