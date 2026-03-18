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

export async function test_api_department_list_pagination_one_level_hierarchy(
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
  typia.assert<IHrmTimeTrackingManager.IAuthorized>(authorized);
  const page = 1;
  const limit = 10;
  const sort = "+name";
  const request = {
    page,
    limit,
    sort,
  } satisfies IHrmTimeTrackingDepartment.IRequest;
  const firstPage =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: request,
      },
    );
  typia.assert<IPageIHrmTimeTrackingDepartment.ISummary>(firstPage);
  TestValidator.equals(
    "pagination current matches requested page",
    firstPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    firstPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  if (firstPage.pagination.records === 0) {
    TestValidator.equals("empty page has no data", firstPage.data.length, 0);
    TestValidator.equals(
      "empty page has zero pages",
      firstPage.pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "non-empty result has at least one page",
      firstPage.pagination.pages >= 1,
    );
    if (firstPage.pagination.pages > 0) {
      TestValidator.predicate(
        "current page is within total pages",
        firstPage.pagination.current <= firstPage.pagination.pages,
      );
    }
  }
  const repeatedPage =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: request,
      },
    );
  typia.assert<IPageIHrmTimeTrackingDepartment.ISummary>(repeatedPage);
  TestValidator.equals(
    "repeated retrieval with same criteria is stable",
    repeatedPage,
    firstPage,
  );
  const topLevelPage =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort,
          isTopLevel: true,
        } satisfies IHrmTimeTrackingDepartment.IRequest,
      },
    );
  typia.assert<IPageIHrmTimeTrackingDepartment.ISummary>(topLevelPage);
  TestValidator.predicate(
    "top-level slice respects limit",
    topLevelPage.data.length <= topLevelPage.pagination.limit,
  );
  TestValidator.equals(
    "top-level pagination limit matches request",
    topLevelPage.pagination.limit,
    5,
  );
  const childPage =
    await api.functional.hrmTimeTracking.manager.departments.index(
      managerConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort,
          isTopLevel: false,
        } satisfies IHrmTimeTrackingDepartment.IRequest,
      },
    );
  typia.assert<IPageIHrmTimeTrackingDepartment.ISummary>(childPage);
  TestValidator.predicate(
    "child slice respects limit",
    childPage.data.length <= childPage.pagination.limit,
  );
  TestValidator.equals(
    "child pagination limit matches request",
    childPage.pagination.limit,
    5,
  );
  if (topLevelPage.pagination.records > 0 && childPage.pagination.records > 0) {
    TestValidator.notEquals(
      "top-level and child hierarchy slices are independently browsable",
      topLevelPage,
      childPage,
    );
  }
}
