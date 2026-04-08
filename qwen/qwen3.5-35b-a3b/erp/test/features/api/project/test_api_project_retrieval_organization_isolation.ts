import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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

/**
 * Test organization context isolation for project retrieval.
 *
 * Validates the organization isolation mechanism for project access control, ensuring that users can only retrieve projects belonging to their own organization context. The test creates two separate member accounts with distinct organizations, generates a project in the first organization, and then attempts to access that project using the second organization's credentials. This validates that the organization context from the authentication middleware is properly applied and enforced at the API level.
 *
 * Special attention is given to verifying that the HTTP response correctly returns 403 Forbidden status when accessing a project from a different organization, confirming that organization isolation is properly implemented as a security boundary.
 *
 * 1. Authenticate Member A and create Organization A via member join registration.
 * 2. Create a project within Organization A with randomized name and color.
 * 3. Authenticate Member B and create Organization B via separate registration.
 * 4. Attempt to retrieve the Organization A project while authenticated as Member B.
 * 5. Validate that the API returns 403 Forbidden status code.
 * 6. Confirm the organization isolation error message is present in response.
 */
export async function test_api_project_retrieval_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A and create Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      href: "http://test.local/signup",
      referrer: "http://test.local",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Create a project in Organization A
  memberAConnection.headers ??= {};
  memberAConnection.headers.Authorization = memberAAuth.token.access;
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Register Member B and create Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      org_name: RandomGenerator.name(),
      org_currency: "EUR",
      href: "http://test.local/signup",
      referrer: "http://test.local",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 4. Attempt to retrieve the project while authenticated as Member B
  // This should return 403 Forbidden due to organization isolation
  memberBConnection.headers ??= {};
  memberBConnection.headers.Authorization = memberBAuth.token.access;
  await TestValidator.httpError(
    "project belongs to different organization",
    403,
    async () => {
      await api.functional.hrmPlatform.member.projects.at(memberBConnection, {
        projectId: project.id,
      });
    },
  );
}