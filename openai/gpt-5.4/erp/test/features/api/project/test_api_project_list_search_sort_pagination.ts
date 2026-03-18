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

export async function test_api_project_list_search_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  const projectConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
  };
  const page = 1;
  const limit = 10;
  const search = RandomGenerator.alphabets(3).toLowerCase();
  const body = {
    status: "active",
    search,
    page,
    limit,
    sort: "name",
  } satisfies IHrmTimeTrackingProject.IRequest;
  const output = await api.functional.hrmTimeTracking.projects.index(
    projectConnection,
    { body },
  );
  typia.assert(output);
  TestValidator.equals(
    "pagination current matches request page",
    output.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request limit",
    output.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "record count is not smaller than returned slice length",
    output.pagination.records >= output.data.length,
  );
  TestValidator.equals(
    "page count matches record count and limit",
    output.pagination.pages,
    output.pagination.records === 0
      ? 0
      : Math.ceil(output.pagination.records / output.pagination.limit),
  );
  TestValidator.predicate(
    "returned slice size respects limit",
    output.data.length <= limit,
  );
  output.data.forEach((project, index) => {
    const matchedText =
      `${project.name} ${project.description ?? ""}`.toLowerCase();
    TestValidator.equals(
      `returned project status matches filter #${index}`,
      project.status,
      body.status,
    );
    TestValidator.predicate(
      `returned project matches search keyword #${index}`,
      matchedText.includes(search),
    );
    TestValidator.predicate(
      `returned project has organization name #${index}`,
      project.organization.name.length > 0,
    );
  });
  for (let i = 1; i < output.data.length; ++i) {
    TestValidator.predicate(
      `projects are sorted by name ascending between indexes ${i - 1} and ${i}`,
      output.data[i - 1].name.localeCompare(output.data[i].name) <= 0,
    );
  }
}
