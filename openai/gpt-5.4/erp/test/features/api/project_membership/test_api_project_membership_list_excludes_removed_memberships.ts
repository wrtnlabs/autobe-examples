import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_project_membership_list_excludes_removed_memberships(
  connection: api.IConnection,
): Promise<void> {
  const readerConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const body = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingProjectMembership.IRequest;
  const result =
    await api.functional.hrmTimeTracking.projects.memberships.index(
      readerConnection,
      {
        projectId: typia.random<string & tags.Format<"uuid">>(),
        body,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "current page matches request",
    result.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "page limit matches request",
    result.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    result.data.length <= body.limit,
  );
  TestValidator.predicate(
    "zero records produce zero pages",
    result.pagination.records !== 0 || result.pagination.pages === 0,
  );
  TestValidator.predicate(
    "non-zero records produce expected page count",
    result.pagination.records === 0 ||
      result.pagination.pages ===
        Math.ceil(result.pagination.records / result.pagination.limit),
  );
  for (const membership of result.data) {
    TestValidator.equals(
      "active memberships have null deleted_at",
      membership.deleted_at,
      null,
    );
  }
}
