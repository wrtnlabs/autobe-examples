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

export async function test_api_project_list_status_filter_current_organization_only(
  connection: api.IConnection,
): Promise<void> {
  const scopedConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const body = {
    status: "archived",
    page: 1,
    limit: 100,
    sort: "created_at",
  } satisfies IHrmTimeTrackingProject.IRequest;
  const page = await api.functional.hrmTimeTracking.projects.index(
    scopedConnection,
    {
      body,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "records cover returned data size",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "pages are internally consistent",
    page.pagination.records === 0
      ? page.pagination.pages === 0
      : page.pagination.pages >= 1,
  );
  if (page.data.length === 0) return;
  const organizationId = page.data[0]!.organization.id;
  for (const project of page.data) {
    TestValidator.equals(
      "all projects belong to the same current organization",
      project.organization.id,
      organizationId,
    );
    TestValidator.equals(
      "every returned project has requested archived status",
      project.status,
      body.status,
    );
    TestValidator.notEquals(
      "returned project status is not active",
      project.status,
      "active",
    );
    TestValidator.notEquals(
      "returned project status is not completed",
      project.status,
      "completed",
    );
  }
}
