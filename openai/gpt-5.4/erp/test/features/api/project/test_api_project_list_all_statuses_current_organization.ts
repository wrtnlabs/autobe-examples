import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_project_list_all_statuses_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const projectViewerConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const request = {
    page: 1 satisfies number as number,
    limit: 20 satisfies number as number,
    sort: "updated_at",
  } satisfies IHrmTimeTrackingProject.IRequest;
  const page = await api.functional.hrmTimeTracking.projects.index(
    projectViewerConnection,
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
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages follow records and limit",
    page.pagination.pages ===
      Math.ceil(page.pagination.records / page.pagination.limit),
  );
  TestValidator.predicate(
    "data length does not exceed page limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "empty records produce empty page data",
    page.pagination.records !== 0 || page.data.length === 0,
  );
  TestValidator.predicate(
    "zero records produce zero pages",
    page.pagination.records !== 0 || page.pagination.pages === 0,
  );
  TestValidator.predicate(
    "non-empty page metadata has valid current range",
    page.pagination.pages === 0 ||
      (page.pagination.current >= 1 &&
        page.pagination.current <= page.pagination.pages),
  );
  for (const project of page.data) {
    TestValidator.predicate(
      "project status is a supported lifecycle value",
      ["active", "archived", "completed"].includes(project.status),
    );
  }
}
