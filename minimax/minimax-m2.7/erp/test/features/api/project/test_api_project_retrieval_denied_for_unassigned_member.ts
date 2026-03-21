import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test that a member without project membership AND without project:manage
 * permission receives 403 Forbidden when trying to view a project.
 *
 * Setup:
 * 1. Create member1 who will attempt unauthorized access
 * 2. Create member2 who creates a project
 * 3. Verify member1 is NOT a member of member2's project
 *
 * Test:
 * Call GET /erpHrm/member/projects/{projectId} where projectId belongs to
 * member2's project, using member1's credentials.
 *
 * Validation:
 * - Response status should be 403 Forbidden
 *
 * This validates the business rule: project membership serves as authorization
 * mechanism, and being a member of the system does not grant access to projects
 * they are not assigned to.
 */
export async function test_api_project_retrieval_denied_for_unassigned_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member1 who will attempt unauthorized access
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  // Step 2: Create member2 who will own the project
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  // Step 3: Member2 creates a project (member1 is NOT added to this project)
  const project = await generate_random_erp_hrm_member_projects_create(
    member2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Step 4: Member1 attempts to access member2's project - should be denied with 403
  await TestValidator.httpError(
    "member without project membership should receive 403",
    403,
    async () =>
      await api.functional.erpHrm.member.projects.at(member1Connection, {
        projectId: project.id,
      }),
  );
}
