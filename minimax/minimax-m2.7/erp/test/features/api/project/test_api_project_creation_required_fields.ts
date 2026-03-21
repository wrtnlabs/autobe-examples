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

export async function test_api_project_creation_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create project with required fields only (name, color, status='active')
  const hexColor = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(
      6,
      "0",
    ) as `${string}${string}${string}${string}${string}${string}`;
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: `#${hexColor}` as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(project);
  // 3. Validate the created project
  TestValidator.predicate("project has unique UUID", project.id.length === 36);
  TestValidator.predicate(
    "project has non-empty name",
    project.name.length > 0,
  );
  TestValidator.equals("project status is active", project.status, "active");
  TestValidator.predicate(
    "color is valid hex format",
    /^#[0-9A-Fa-f]{6}$/.test(project.color),
  );
  TestValidator.predicate(
    "organization context exists",
    !!project.organization,
  );
  TestValidator.predicate(
    "organization has valid UUID",
    project.organization.id.length === 36,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(project.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(project.updated_at)),
  );
}
