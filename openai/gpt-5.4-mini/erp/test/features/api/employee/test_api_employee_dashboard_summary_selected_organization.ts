import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";

export async function test_api_employee_dashboard_summary_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const email = `member_${RandomGenerator.alphabets(8)}@test.com`;
  const password = `P@ssw0rd!${RandomGenerator.alphabets(4)}`;
  const displayName = RandomGenerator.name();
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      name: displayName,
      href: `https://example.com/signup/${RandomGenerator.alphabets(6)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(6)}`,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organizationOne =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Org ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organizationOne);
  const firstSummary =
    await api.functional.erpHrmTime.member.employee_dashboard_summary.at(
      memberConnection,
    );
  typia.assert(firstSummary);
  TestValidator.predicate(
    "dashboard snapshot should contain non-negative today hours",
    firstSummary.hoursLoggedToday >= 0,
  );
  TestValidator.predicate(
    "dashboard snapshot should contain non-negative weekly hours",
    firstSummary.hoursLoggedThisWeek >= 0,
  );
  TestValidator.predicate(
    "dashboard snapshot should indicate timer state consistently",
    firstSummary.hasActiveTimer
      ? firstSummary.activeTimerStartedAt !== null
      : firstSummary.activeTimerStartedAt === null,
  );
  TestValidator.predicate(
    "dashboard snapshot should contain non-negative recent timelog count",
    firstSummary.recentTimelogCount >= 0,
  );
  TestValidator.predicate(
    "dashboard snapshot should contain non-negative task counters",
    firstSummary.assignedOpenTaskCount >= 0 &&
      firstSummary.assignedInProgressTaskCount >= 0,
  );
  TestValidator.predicate(
    "dashboard snapshot should be precomputed with timestamps",
    firstSummary.snapshotAt <= firstSummary.updatedAt &&
      firstSummary.createdAt <= firstSummary.updatedAt &&
      firstSummary.recentTimelogSnapshotAt <= firstSummary.snapshotAt,
  );
  const organizationTwo =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Org ${RandomGenerator.alphabets(6)} B`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organizationTwo);
  const secondSummary =
    await api.functional.erpHrmTime.member.employee_dashboard_summary.at(
      memberConnection,
    );
  typia.assert(secondSummary);
  TestValidator.predicate(
    "switched organization summary should still be a complete snapshot",
    secondSummary.hoursLoggedToday >= 0 &&
      secondSummary.hoursLoggedThisWeek >= 0 &&
      secondSummary.recentTimelogCount >= 0 &&
      secondSummary.assignedOpenTaskCount >= 0 &&
      secondSummary.assignedInProgressTaskCount >= 0 &&
      secondSummary.snapshotAt <= secondSummary.updatedAt,
  );
  TestValidator.notEquals(
    "dashboard snapshots should not be identical across different organization contexts",
    firstSummary.snapshotAt,
    secondSummary.snapshotAt,
  );
}
