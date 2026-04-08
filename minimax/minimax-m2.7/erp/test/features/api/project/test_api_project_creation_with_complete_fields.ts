import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_creation_with_complete_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create project with complete fields including all optional fields
  const projectName = RandomGenerator.paragraph({ sentences: 2 });
  const body = {
    name: projectName,
    color: "#FF5733",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active" as const,
    budgetHours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100>
    >(),
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IErpHrmProject.ICreate;
  const output = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    { body },
  );
  typia.assert(output);
  // 3. Validate response structure (IErpHrmProject - budget report format)
  TestValidator.equals("has items array", Array.isArray(output.items), true);
  TestValidator.equals("has total count", typeof output.total, "number");
  TestValidator.predicate("total is non-negative", output.total >= 0);
  // 4. Find the newly created project in the budget report items
  const createdProjectEntry = output.items.find(
    (item) => item.projectName === body.name,
  );
  TestValidator.predicate(
    "newly created project appears in budget report",
    createdProjectEntry !== undefined,
  );
  // 5. Validate project details in budget report entry
  if (createdProjectEntry) {
    TestValidator.equals(
      "project name matches input",
      createdProjectEntry.projectName,
      body.name,
    );
    TestValidator.equals(
      "budget hours matches input",
      createdProjectEntry.budgetHours,
      body.budgetHours,
    );
    TestValidator.equals(
      "actual hours is 0 for new project",
      createdProjectEntry.actualHoursLogged,
      0,
    );
    TestValidator.equals(
      "budget utilization is 0 for new project",
      createdProjectEntry.budgetUtilizationPercentage,
      0,
    );
    TestValidator.equals(
      "budget status is within_budget for new project",
      createdProjectEntry.budgetStatus,
      "within_budget",
    );
    TestValidator.predicate(
      "project has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdProjectEntry.projectId,
      ),
    );
  }
}
