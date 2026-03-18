import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_memberships_create } from "../../../generate/generate_random_hrm_time_tracking_projects_memberships_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_hrm_time_tracking_project_membership";

export async function test_api_project_membership_detail_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const sourceOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `source-org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(sourceOrganization);
  const sourceProject = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: `source-project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        color_code: "#3366FF",
        status: "active",
        budget_hours: 160,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(sourceProject);
  TestValidator.equals(
    "source project belongs to source organization",
    sourceProject.organization.id,
    sourceOrganization.id,
  );
  const alternateOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `alternate-org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 7,
        },
      },
    );
  typia.assert(alternateOrganization);
  TestValidator.notEquals(
    "organizations must differ",
    alternateOrganization.id,
    sourceOrganization.id,
  );
  const alternateProject =
    await generate_random_hrm_time_tracking_projects_create(ownerConnection, {
      body: {
        name: `alternate-project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        color_code: "#FF6633",
        status: "active",
        budget_hours: 80,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  typia.assert(alternateProject);
  TestValidator.equals(
    "alternate project belongs to alternate organization",
    alternateProject.organization.id,
    alternateOrganization.id,
  );
  TestValidator.notEquals(
    "projects belong to different organizations",
    alternateProject.organization.id,
    sourceProject.organization.id,
  );
  await TestValidator.httpError(
    "membership detail is isolated by active organization context",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.projects.memberships.at(
        ownerConnection,
        {
          projectId: sourceProject.id,
          membershipId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
