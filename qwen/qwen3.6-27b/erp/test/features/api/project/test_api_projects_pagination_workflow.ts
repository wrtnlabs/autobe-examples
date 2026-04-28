import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_projects_pagination_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member via POST /hrmPlatform/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create three projects via POST /hrmPlatform/member/projects
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project2);
  const project3 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project3);
  // 3. Request projects with limit=2, page=1
  const page1Response = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(page1Response);
  // 4. Verify response returns exactly 2 projects in the data array
  TestValidator.equals(
    "first page returns exactly 2 projects",
    page1Response.data.length,
    2,
  );
  // 5. Verify pagination metadata: current=1, limit=2, records=3, pages=2
  TestValidator.equals(
    "current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page limit is 2", page1Response.pagination.limit, 2);
  TestValidator.equals(
    "total records is 3",
    page1Response.pagination.records,
    3,
  );
  TestValidator.equals("total pages is 2", page1Response.pagination.pages, 2);
  // 6. Request projects with limit=2, page=2
  const page2Response = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        limit: 2,
        page: 2,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(page2Response);
  // 7. Verify response returns the remaining 1 project
  TestValidator.equals(
    "second page returns exactly 1 project",
    page2Response.data.length,
    1,
  );
  // 8. Verify pagination metadata: current=2, limit=2, records=3, pages=2
  TestValidator.equals(
    "current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page limit is 2", page2Response.pagination.limit, 2);
  TestValidator.equals(
    "total records is 3",
    page2Response.pagination.records,
    3,
  );
  TestValidator.equals("total pages is 2", page2Response.pagination.pages, 2);
  // 9. Verify each project summary contains required fields
  for (const project of [...page1Response.data, ...page2Response.data]) {
    typia.assert<IHrmPlatformProject.ISummary>(project);
  }
  // 10. Verify projects are scoped to the authenticated member's organization only
  TestValidator.predicate("all projects belong to the same organization", () =>
    [...page1Response.data, ...page2Response.data].every(
      (project) => project.organization.id === project1.organization.id,
    ),
  );
}
