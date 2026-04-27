import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Test that the organization list search/filter capability works correctly.
 *
 * Registers a member, creates two organizations with distinct names ("Alpha Corp" and "Beta Inc") both using the same currency (USD) and timezone (Asia/Seoul). Calls PATCH /member/organizations with search='Alpha' to filter by name, verifying the response contains only the "Alpha Corp" organization in the data array while "Beta Inc" is excluded. Also tests filtering by status='active' to verify no deleted orgs appear, confirming both active organizations are included in the results.
 *
 * 1. Register a new member account via authorize_member_join.
 * 2. Create "Alpha Corp" organization with currency USD and timezone Asia/Seoul.
 * 3. Create "Beta Inc" organization with currency USD and timezone Asia/Seoul.
 * 4. Call PATCH /member/organizations with search='Alpha' and verify only Alpha Corp is returned.
 * 5. Call PATCH /member/organizations with status='active' and verify both orgs appear.
 */
export async function test_api_organization_list_name_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // 2. Create 'Alpha Corp' organization
  const alphaOrg: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Alpha Corp",
          currency: "USD",
          timezone: "Asia/Seoul",
        },
      },
    );
  typia.assert(alphaOrg);
  // 3. Create 'Beta Inc' organization
  const betaOrg: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Beta Inc",
          currency: "USD",
          timezone: "Asia/Seoul",
        },
      },
    );
  typia.assert(betaOrg);
  // 4. Search by name 'Alpha' — only Alpha Corp should appear
  const searchResult: IPageIHrmTimeTrackingOrganization.ISummary =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      {
        body: {
          search: "Alpha",
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search result count for 'Alpha'",
    searchResult.data.length,
    1,
  );
  TestValidator.equals(
    "first organization name is Alpha Corp",
    searchResult.data[0].name,
    "Alpha Corp",
  );
  // 5. Filter by status='active' — both orgs should appear
  const activeResult: IPageIHrmTimeTrackingOrganization.ISummary =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(activeResult);
  TestValidator.predicate(
    "active orgs contain both Alpha Corp and Beta Inc",
    () => {
      const names = activeResult.data.map((o) => o.name);
      return names.includes("Alpha Corp") && names.includes("Beta Inc");
    },
  );
}
