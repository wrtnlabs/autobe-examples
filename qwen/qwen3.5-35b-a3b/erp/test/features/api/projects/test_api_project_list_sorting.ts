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

export async function test_api_project_list_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup member authentication
  const authConnection: api.IConnection = { host: connection.host };
  const auth: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    authConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(auth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: auth.token.access };
  // 2. Create 3 projects with distinct timestamps and start dates
  const timestamp1 = "2024-01-15T10:00:00Z";
  const timestamp2 = "2024-06-15T10:00:00Z";
  const timestamp3 = "2024-12-15T10:00:00Z";
  const projectAlpha = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: "Alpha",
        color_code: "#FF5733",
        start_date: timestamp1,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectAlpha);
  const projectBeta = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: "Beta",
        color_code: "#33FF57",
        start_date: timestamp2,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectBeta);
  const projectGamma = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: "Gamma",
        color_code: "#3357FF",
        start_date: timestamp3,
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectGamma);
  // 3. Test sorting by created_at ascending
  const sortedAsc = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(sortedAsc);
  TestValidator.equals(
    "created_at asc order",
    sortedAsc.data.map((p) => p.id),
    [projectAlpha.id, projectBeta.id, projectGamma.id],
  );
  // 4. Test sorting by created_at descending
  const sortedDesc = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(sortedDesc);
  TestValidator.equals(
    "created_at desc order",
    sortedDesc.data.map((p) => p.id),
    [projectGamma.id, projectBeta.id, projectAlpha.id],
  );
  // 5. Test sorting by name ascending
  const sortedByName = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(sortedByName);
  TestValidator.equals(
    "name asc order",
    sortedByName.data.map((p) => p.id),
    [projectAlpha.id, projectBeta.id, projectGamma.id],
  );
  // 6. Test date range filter
  const filteredByDate = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        start_date_range: {
          gte: "2024-01-01T00:00:00Z",
          lte: "2024-06-30T23:59:59Z",
        },
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(filteredByDate);
  const filteredIds = filteredByDate.data.map((p) => p.id);
  TestValidator.equals(
    "date range excludes project outside range",
    filteredIds.includes(projectGamma.id),
    false,
  );
  TestValidator.equals(
    "date range includes projects within range",
    filteredIds.includes(projectAlpha.id) &&
      filteredIds.includes(projectBeta.id),
    true,
  );
  // 7. Test has budget filter
  const projectWithBudget =
    await api.functional.hrmPlatform.member.projects.create(memberConnection, {
      body: {
        name: "Budget Project",
        color_code: "#FF57FF",
        budget_hours: 100,
      } satisfies IHrmPlatformProject.ICreate,
    });
  typia.assert(projectWithBudget);
  const projectWithoutBudget =
    await api.functional.hrmPlatform.member.projects.create(memberConnection, {
      body: {
        name: "No Budget Project",
        color_code: "#57FF57",
      } satisfies IHrmPlatformProject.ICreate,
    });
  typia.assert(projectWithoutBudget);
  const withBudget = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        has_budget: true,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(withBudget);
  TestValidator.predicate(
    "has_budget=true returns only projects with budget_hours",
    withBudget.data.every(
      (p) => p.budget_hours !== null && p.budget_hours !== undefined,
    ),
  );
  const withoutBudget = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        has_budget: false,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(withoutBudget);
  TestValidator.predicate(
    "has_budget=false returns only projects without budget_hours",
    withoutBudget.data.every(
      (p) => p.budget_hours === null || p.budget_hours === undefined,
    ),
  );
}