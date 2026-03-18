import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_detail_retrieve_active_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const projectInput = {
    name: RandomGenerator.name(),
    description: null,
    colorCode: "#3366ff",
    status: "active",
    budgetHours: null,
    startDate: null,
    endDate: null,
  } satisfies IHrmTimeTrackingProject.ICreate;
  const created = await api.functional.hrmTimeTracking.member.projects.create(
    memberConnection,
    {
      body: projectInput,
    },
  );
  typia.assert(created);
  const detail = await api.functional.hrmTimeTracking.member.projects.at(
    memberConnection,
    {
      projectId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("project id", detail.id, created.id);
  TestValidator.equals(
    "project organization id",
    detail.organization.id,
    created.organization.id,
  );
  TestValidator.equals(
    "project organization name",
    detail.organization.name,
    created.organization.name,
  );
  TestValidator.equals(
    "project organization description",
    detail.organization.description,
    created.organization.description,
  );
  TestValidator.equals(
    "project organization logo image url",
    detail.organization.logoImageUrl,
    created.organization.logoImageUrl,
  );
  TestValidator.equals(
    "project organization currency",
    detail.organization.currency,
    created.organization.currency,
  );
  TestValidator.equals(
    "project organization timezone",
    detail.organization.timezone,
    created.organization.timezone,
  );
  TestValidator.equals(
    "project organization fiscal start month",
    detail.organization.fiscalStartMonth,
    created.organization.fiscalStartMonth,
  );
  TestValidator.equals(
    "project organization created at",
    detail.organization.createdAt,
    created.organization.createdAt,
  );
  TestValidator.equals(
    "project organization updated at",
    detail.organization.updatedAt,
    created.organization.updatedAt,
  );
  TestValidator.equals(
    "project organization deleted at",
    detail.organization.deletedAt,
    created.organization.deletedAt,
  );
  TestValidator.equals("project name", detail.name, created.name);
  TestValidator.equals(
    "project description",
    detail.description,
    created.description,
  );
  TestValidator.equals(
    "project color code",
    detail.colorCode,
    created.colorCode,
  );
  TestValidator.equals("project status", detail.status, created.status);
  TestValidator.equals(
    "project budget hours",
    detail.budgetHours,
    created.budgetHours,
  );
  TestValidator.equals(
    "project start date",
    detail.startDate,
    created.startDate,
  );
  TestValidator.equals("project end date", detail.endDate, created.endDate);
  TestValidator.equals(
    "project created at",
    detail.createdAt,
    created.createdAt,
  );
  TestValidator.equals(
    "project updated at",
    detail.updatedAt,
    created.updatedAt,
  );
  TestValidator.equals(
    "project deleted at",
    detail.deletedAt,
    created.deletedAt,
  );
}
