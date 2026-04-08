import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Admin A and a project
  const adminAConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminAConnection,
    {},
  );
  typia.assert(project);
  // Get the project ID from the created project's entries
  const projectId =
    project.items[0]?.projectId ?? typia.random<string & tags.Format<"uuid">>();
  // 2. Create Admin B (unauthorized user - another admin account)
  // Note: In this ERP system, all admins have full access by default.
  // The test validates that a different admin account cannot delete
  // projects created by another admin in the same organization context.
  const adminBConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 3. Attempt to delete project as admin B - should be rejected with 403
  // Since we're testing that admin B (with different session) cannot delete
  // the project created by admin A, we expect a 403 Forbidden error.
  await TestValidator.httpError(
    "unauthorized user cannot delete project",
    403,
    async () => {
      await api.functional.erpHrm.admin.projects.erase(adminBConnection, {
        projectId: projectId,
      });
    },
  );
}
