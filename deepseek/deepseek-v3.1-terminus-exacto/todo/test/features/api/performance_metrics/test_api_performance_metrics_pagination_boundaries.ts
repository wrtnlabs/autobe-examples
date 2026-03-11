import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoPerformanceMetric";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_performance_metrics_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Test pagination boundaries with valid data
  // First page test
  const firstPage =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page should have valid pagination",
    firstPage.pagination.current >= 1,
  );
  // Last page test
  const lastPage =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          page: firstPage.pagination.pages,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page should match total pages",
    lastPage.pagination.current,
    firstPage.pagination.pages,
  );
  // 3. Test limit boundaries
  // Minimum limit test
  const minLimit =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: 1 satisfies number as number,
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(minLimit);
  TestValidator.equals(
    "minimum limit should be 1",
    minLimit.pagination.limit,
    1,
  );
  // Maximum limit test
  const maxLimit =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: 100 satisfies number as number,
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals(
    "maximum limit should be 100",
    maxLimit.pagination.limit,
    100,
  );
  // 4. Test sorting options
  // Ascending timestamp
  const ascSort =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sort: "timestamp_asc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(ascSort);
  // Descending timestamp
  const descSort =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(descSort);
  // 5. Test pages beyond available data
  const beyondPage =
    await api.functional.multiUserTodo.admin.performance_metrics.index(
      adminConnection,
      {
        body: {
          page: firstPage.pagination.pages + 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sort: "timestamp_desc",
        } satisfies IMultiUserTodoPerformanceMetric.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "page beyond total should have empty data",
    beyondPage.data.length === 0,
  );
}
