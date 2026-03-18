import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_assigned_projects_list(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const request = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingProject.IRequest;
  const output =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      { body: request },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data does not exceed pagination limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "assigned projects endpoint returns project summaries",
    () =>
      output.data.every(
        (project) =>
          typeof project.id === "string" &&
          project.id.length > 0 &&
          typeof project.name === "string" &&
          project.name.length > 0 &&
          typeof project.colorCode === "string" &&
          project.colorCode.length > 0 &&
          typeof project.status === "string" &&
          typeof project.organization.id === "string" &&
          project.organization.id.length > 0 &&
          typeof project.organization.name === "string" &&
          project.organization.name.length > 0 &&
          typeof project.organization.currency === "string" &&
          typeof project.organization.timezone === "string",
      ),
  );
  TestValidator.predicate(
    "all returned projects are scoped to the same active organization",
    () =>
      output.data.length === 0 ||
      output.data.every(
        (project) =>
          project.organization.id === output.data[0]!.organization.id,
      ),
  );
  TestValidator.predicate(
    "response is a valid empty page when no assigned projects exist",
    output.data.length >= 0 && output.pagination.records >= output.data.length,
  );
}
