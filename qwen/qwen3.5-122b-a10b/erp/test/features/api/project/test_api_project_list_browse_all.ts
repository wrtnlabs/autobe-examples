import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_list_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Browse projects without filtering criteria (default pagination)
  const projectsResponse = await api.functional.hrm.member.projects.index(
    memberConnection,
    {
      body: {} satisfies IHrmProject.IRequest,
    },
  );
  typia.assert(projectsResponse);
  // 3. Validate response structure has pagination and data
  TestValidator.predicate(
    "response has pagination object",
    projectsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(projectsResponse.data),
  );
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is non-negative",
    projectsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    projectsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    projectsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    projectsResponse.pagination.pages >= 0,
  );
  // 5. Validate project summary structure if data exists
  if (projectsResponse.data.length > 0) {
    const firstProject = projectsResponse.data[0];
    typia.assert(firstProject);
    // 6. Validate organization belongs to member's context
    TestValidator.predicate(
      "organization has id",
      firstProject.organization.id !== undefined,
    );
    TestValidator.predicate(
      "organization has name",
      firstProject.organization.name !== undefined,
    );
  }
  // 7. Validate default pagination parameters (page 1, limit 20)
  TestValidator.equals(
    "default page is 1",
    projectsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    projectsResponse.pagination.limit,
    20,
  );
}
