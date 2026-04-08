import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";

export async function test_api_project_create_permission_and_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const secondConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `member_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "P@ssw0rd1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const secondMember = await authorize_member_join(secondConnection, {
    body: {
      email: `member2_${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "P@ssw0rd1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(secondMember);
  const projectCreateBody = {
    name: `project-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    colorCode: `#${RandomGenerator.alphabets(6)}`,
    status: "active",
  } satisfies IErpHrmTimeProject.ICreate;
  await TestValidator.httpError(
    "member without project management permission should not create a project",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.projects.create(memberConnection, {
        body: projectCreateBody,
      });
    },
  );
  await TestValidator.httpError(
    "second member without project management permission should also be rejected",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.projects.create(secondConnection, {
        body: {
          name: projectCreateBody.name,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: `#${RandomGenerator.alphabets(6)}`,
          status: "active",
        } satisfies IErpHrmTimeProject.ICreate,
      });
    },
  );
}
