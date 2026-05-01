import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test that project creation is rejected when the member lacks the project:manage permission.
 *
 * Validates strict authorization enforcement at the project creation endpoint. A newly registered member with no organization membership and no role-based permissions attempts to create a project with valid required fields — a non-empty name and a well-formed hex color code. The system must reject the request with a 403 Forbidden response, confirming that the project:manage permission is a hard requirement and cannot be bypassed even with perfectly valid input data.
 *
 * This test ensures the authorization layer correctly evaluates the member's permission set before any business logic or data validation runs, preventing unauthorized project creation at the earliest possible gate.
 *
 * 1. A fresh member registers and authenticates via authorize_member_join.
 * 2. The member attempts to create a project with valid name and color_code.
 * 3. The system returns 403 Forbidden due to missing project:manage permission.
 */
export async function test_api_project_create_unauthorized_no_permission(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  await TestValidator.httpError(
    "project:manage permission required",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.create(memberConnection, {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#FF5733",
        } satisfies IErpHrmProject.ICreate,
      });
    },
  );
}
