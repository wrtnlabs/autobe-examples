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

export async function test_api_department_list_one_level_hierarchy_view(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {},
  });
  typia.assert(authorized);
  const topLevelRequest = {
    isTopLevel: true,
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "+name",
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const topLevelPage =
    await api.functional.hrmTimeTracking.owner.departments.index(
      ownerConnection,
      {
        body: topLevelRequest,
      },
    );
  typia.assert(topLevelPage);
  TestValidator.equals(
    "top-level current page matches request",
    topLevelPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "top-level limit matches request",
    topLevelPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "top-level records are non-negative",
    topLevelPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "top-level pages are non-negative",
    topLevelPage.pagination.pages >= 0,
  );
  for (const department of topLevelPage.data) {
    typia.assert(department);
    TestValidator.predicate(
      "top-level department is active in ordinary list results",
      department.deleted_at === null,
    );
  }
  const childRequest = {
    isTopLevel: false,
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "+name",
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const childPage =
    await api.functional.hrmTimeTracking.owner.departments.index(
      ownerConnection,
      {
        body: childRequest,
      },
    );
  typia.assert(childPage);
  TestValidator.equals(
    "child current page matches request",
    childPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "child limit matches request",
    childPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "child records are non-negative",
    childPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "child pages are non-negative",
    childPage.pagination.pages >= 0,
  );
  for (const department of childPage.data) {
    typia.assert(department);
    TestValidator.predicate(
      "child department is active in ordinary list results",
      department.deleted_at === null,
    );
  }
  const unfilteredRequest = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "+name",
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const unfilteredPage =
    await api.functional.hrmTimeTracking.owner.departments.index(
      ownerConnection,
      {
        body: unfilteredRequest,
      },
    );
  typia.assert(unfilteredPage);
  TestValidator.equals(
    "unfiltered current page matches request",
    unfilteredPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "unfiltered limit matches request",
    unfilteredPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "unfiltered records are non-negative",
    unfilteredPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "unfiltered pages are non-negative",
    unfilteredPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "unfiltered list count covers each filtered page count",
    unfilteredPage.data.length >= topLevelPage.data.length &&
      unfilteredPage.data.length >= childPage.data.length,
  );
}
