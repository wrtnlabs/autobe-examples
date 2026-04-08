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

export async function test_api_project_update_with_org_scope_and_lifecycle_rules(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner_${RandomGenerator.alphabets(8)}@example.com`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}`,
      displayName: `Owner ${RandomGenerator.alphabets(6)}`,
      href: `https://example.com/onboarding/${RandomGenerator.alphabets(6)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(6)}`,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerSession: api.IConnection = {
    host: connection.host,
    headers: { Authorization: ownerAuth.token.access },
  };
  const primaryProject =
    await generate_random_erp_hrm_time_member_projects_create(ownerSession, {
      body: {
        name: `Primary ${RandomGenerator.alphabets(8)}`,
        description: "Initial project",
        colorCode: "#112233",
        status: "active",
        budgetHours: 120,
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      } satisfies IErpHrmTimeProject.ICreate,
    });
  typia.assert(primaryProject);
  const siblingProject =
    await generate_random_erp_hrm_time_member_projects_create(ownerSession, {
      body: {
        name: `Sibling ${RandomGenerator.alphabets(8)}`,
        description: "Name collision target",
        colorCode: "#445566",
        status: "active",
        budgetHours: 80,
        startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 40).toISOString(),
      } satisfies IErpHrmTimeProject.ICreate,
    });
  typia.assert(siblingProject);
  const updatedName = `Renamed ${RandomGenerator.alphabets(8)}`;
  const updated = await api.functional.erpHrmTime.member.projects.update(
    ownerSession,
    {
      projectId: primaryProject.id,
      body: {
        name: updatedName,
        description: "Updated project description",
        color_code: "#AABBCC",
        status: "active",
        budget_hours: 240,
        start_date: new Date(Date.now() + 86400000 * 3).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 60).toISOString(),
      } satisfies IErpHrmTimeProject.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("project id preserved", updated.id, primaryProject.id);
  TestValidator.equals("project name updated", updated.name, updatedName);
  TestValidator.equals(
    "project description updated",
    updated.description,
    "Updated project description",
  );
  TestValidator.equals("project color updated", updated.colorCode, "#AABBCC");
  TestValidator.equals(
    "project status remains active",
    updated.status,
    "active",
  );
  TestValidator.equals("project budget updated", updated.budgetHours, 240);
  TestValidator.equals(
    "project organization preserved",
    updated.organization,
    primaryProject.organization,
  );
  TestValidator.notEquals(
    "project timestamp should change",
    primaryProject.updatedAt,
    updated.updatedAt,
  );
  const archived = await api.functional.erpHrmTime.member.projects.update(
    ownerSession,
    {
      projectId: primaryProject.id,
      body: {
        status: "archived",
      } satisfies IErpHrmTimeProject.IUpdate,
    },
  );
  typia.assert(archived);
  TestValidator.equals(
    "archived project id preserved",
    archived.id,
    primaryProject.id,
  );
  TestValidator.equals(
    "archived status persisted",
    archived.status,
    "archived",
  );
  TestValidator.equals(
    "archived project organization preserved",
    archived.organization,
    primaryProject.organization,
  );
  TestValidator.equals(
    "archived project name preserved",
    archived.name,
    updatedName,
  );
  TestValidator.equals(
    "archived project description preserved",
    archived.description,
    "Updated project description",
  );
  TestValidator.equals(
    "archived project color preserved",
    archived.colorCode,
    "#AABBCC",
  );
  TestValidator.equals(
    "archived project budget preserved",
    archived.budgetHours,
    240,
  );
  const completed = await api.functional.erpHrmTime.member.projects.update(
    ownerSession,
    {
      projectId: primaryProject.id,
      body: {
        status: "completed",
      } satisfies IErpHrmTimeProject.IUpdate,
    },
  );
  typia.assert(completed);
  TestValidator.equals(
    "completed project id preserved",
    completed.id,
    primaryProject.id,
  );
  TestValidator.equals(
    "completed status persisted",
    completed.status,
    "completed",
  );
  TestValidator.equals(
    "completed project organization preserved",
    completed.organization,
    primaryProject.organization,
  );
  TestValidator.equals(
    "completed project name preserved",
    completed.name,
    updatedName,
  );
  TestValidator.equals(
    "completed project description preserved",
    completed.description,
    "Updated project description",
  );
  TestValidator.equals(
    "completed project color preserved",
    completed.colorCode,
    "#AABBCC",
  );
  TestValidator.equals(
    "completed project budget preserved",
    completed.budgetHours,
    240,
  );
  await TestValidator.error(
    "duplicate name within organization is rejected",
    async () => {
      await api.functional.erpHrmTime.member.projects.update(ownerSession, {
        projectId: primaryProject.id,
        body: {
          name: siblingProject.name,
        } satisfies IErpHrmTimeProject.IUpdate,
      });
    },
  );
  const foreignOwnerConnection: api.IConnection = { host: connection.host };
  const foreignAuth = await authorize_member_join(foreignOwnerConnection, {
    body: {
      email: `foreign_${RandomGenerator.alphabets(8)}@example.com`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}`,
      displayName: `Foreign ${RandomGenerator.alphabets(6)}`,
      href: `https://example.com/onboarding/${RandomGenerator.alphabets(6)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(6)}`,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(foreignAuth);
  const foreignSession: api.IConnection = {
    host: connection.host,
    headers: { Authorization: foreignAuth.token.access },
  };
  await TestValidator.httpError(
    "updating a foreign organization project is denied",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.projects.update(foreignSession, {
        projectId: primaryProject.id,
        body: {
          description: "Should not apply across tenants",
        } satisfies IErpHrmTimeProject.IUpdate,
      });
    },
  );
}
