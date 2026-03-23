import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerAnalytic";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_employee_statistics_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const orgA = await generate_random_hrm_tracker_member_organizations_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(orgA);
  // 2. Member B joins and creates Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const orgB = await generate_random_hrm_tracker_member_organizations_create(
    memberBConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "EUR",
        timezone: "Europe/Paris",
        fiscal_start_month: 4,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(orgB);
  // 3. Member A attempts to access Organization B's analytics (should fail)
  await TestValidator.error(
    "Member A cannot access Organization B's analytics",
    async () => {
      await api.functional.hrmTracker.member.organizations.analytics.employees.index(
        memberAConnection,
        {
          organizationId: orgB.id,
          body: {} satisfies IHrmTrackerAnalytic.IEmployeeStatisticsRequest,
        },
      );
    },
  );
  // 4. Verify Member B can still access their own organization's analytics
  const statistics =
    await api.functional.hrmTracker.member.organizations.analytics.employees.index(
      memberBConnection,
      {
        organizationId: orgB.id,
        body: {} satisfies IHrmTrackerAnalytic.IEmployeeStatisticsRequest,
      },
    );
  typia.assert(statistics);
  TestValidator.predicate(
    "has valid pagination",
    statistics.pagination.pages >= 0,
  );
}
