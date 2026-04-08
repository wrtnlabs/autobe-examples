import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeTrackingTimezone";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test timezone configuration filtering and search capabilities.
 *
 * Validates the complete filtering and search workflow for timezone configurations including member authentication, multiple organization setup, and filter validation. Ensures that filtering by organization_id and timezone identifier works correctly, pagination metadata reflects filtered results, and sorting produces consistent ordering.
 *
 * Special attention is given to verifying that the total records count in pagination reflects the filtered result set, not all records in the system, and that combined filters produce expected intersections.
 *
 * 1. Register member with initial organization via POST /hrmPlatform/auth/member/join.
 * 2. Create second organization via POST /hrmPlatform/member/organizations to have multiple orgs for filtering.
 * 3. Fetch base timezone listing to get all configurations and their structure.
 * 4. Filter by organization_id - verify only configs from specified org are returned.
 * 5. Filter by timezone identifier - verify only configs with matching timezone string.
 * 6. Test combined filters - organization_id and timezone together.
 * 7. Validate pagination metadata reflects filtered results count.
 * 8. Test sorting by createdAt and updatedAt fields.
 */
export async function test_api_time_tracking_timezone_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: "USD",
        org_timezone: "Asia/Seoul",
        org_fiscal_month: 1,
        href: "http://localhost:3000/test",
        referrer: "http://localhost:3000/test",
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(memberJoin);
  memberConnection.headers = {
    Authorization: memberJoin.token.access,
  };
  // 2. Create second organization via SDK
  const secondOrg: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.member.organizations.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "EUR",
          timezone: "America/New_York",
          fiscal_start_month: 4,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(secondOrg);
  // 3. Fetch base timezone listing to establish baseline
  const baseList =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberConnection,
      {
        body: {
          pageSize: 100,
          limit: 100,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(baseList);
  const baseData: IHrmPlatformTimeTrackingTimezone.ISummary[] = baseList.data;
  const baseCount = baseList.pagination.records;
  // 4. Filter by second organization_id - should return exactly 1 config
  const filteredByOrg =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberConnection,
      {
        body: {
          organization_id: secondOrg.id,
          pageSize: 100,
          limit: 100,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(filteredByOrg);
  // Each organization should have exactly 1 timezone configuration
  TestValidator.equals(
    "filtered by org returns exactly 1 configuration",
    filteredByOrg.pagination.records,
    1,
  );
  const filteredData: IHrmPlatformTimeTrackingTimezone.ISummary[] =
    filteredByOrg.data;
  TestValidator.equals(
    "filtered data array has 1 item",
    filteredData.length,
    1,
  );
  if (filteredData.length > 0) {
    TestValidator.equals(
      "filtered config belongs to requested org",
      filteredData[0].organization.id,
      secondOrg.id,
    );
  }
  // 5. Filter by timezone identifier (Asia/Seoul - from first org)
  const seoulTimezone = "Asia/Seoul";
  const filteredByTimezone =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberConnection,
      {
        body: {
          timezone: seoulTimezone,
          pageSize: 100,
          limit: 100,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(filteredByTimezone);
  const timezoneFilteredData: IHrmPlatformTimeTrackingTimezone.ISummary[] =
    filteredByTimezone.data;
  for (const config of timezoneFilteredData) {
    TestValidator.equals(
      "all configs match filtered timezone",
      config.timezone,
      seoulTimezone,
    );
  }
  // 6. Combined filters - organization_id and timezone (should return 1 if matching)
  const filteredCombined =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberConnection,
      {
        body: {
          organization_id: secondOrg.id,
          timezone: "America/New_York",
          pageSize: 100,
          limit: 100,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(filteredCombined);
  const combinedData: IHrmPlatformTimeTrackingTimezone.ISummary[] =
    filteredCombined.data;
  for (const config of combinedData) {
    TestValidator.equals(
      "combined filter - org matches",
      config.organization.id,
      secondOrg.id,
    );
    TestValidator.equals(
      "combined filter - timezone matches",
      config.timezone,
      "America/New_York",
    );
  }
  // 7. Validate pagination metadata reflects filtered results
  TestValidator.equals(
    "pagination pages calculated correctly for filtered",
    filteredByOrg.pagination.pages,
    Math.ceil(
      filteredByOrg.pagination.records / filteredByOrg.pagination.limit,
    ),
  );
  TestValidator.equals(
    "pagination current page is 1 for new query",
    filteredByOrg.pagination.current,
    1,
  );
  // 8. Test sorting by createdAt asc
  const sortedByCreatedAsc =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
          pageSize: 100,
          limit: 100,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);
  const createdAscData: IHrmPlatformTimeTrackingTimezone.ISummary[] =
    sortedByCreatedAsc.data;
  for (let i = 1; i < createdAscData.length; i++) {
    TestValidator.predicate(
      "createdAt asc - order correct",
      new Date(createdAscData[i].createdAt) >=
        new Date(createdAscData[i - 1].createdAt),
    );
  }
  // 9. Test sorting by createdAt desc
  const sortedByCreatedDesc =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          pageSize: 100,
          limit: 100,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);
  const createdDescData: IHrmPlatformTimeTrackingTimezone.ISummary[] =
    sortedByCreatedDesc.data;
  for (let i = 1; i < createdDescData.length; i++) {
    TestValidator.predicate(
      "createdAt desc - order correct",
      new Date(createdDescData[i].createdAt) <=
        new Date(createdDescData[i - 1].createdAt),
    );
  }
  // 10. Test sorting by updatedAt asc
  const sortedByUpdatedAsc =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberConnection,
      {
        body: {
          sortBy: "updatedAt",
          sortOrder: "asc",
          pageSize: 100,
          limit: 100,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(sortedByUpdatedAsc);
  const updatedAscData: IHrmPlatformTimeTrackingTimezone.ISummary[] =
    sortedByUpdatedAsc.data;
  for (let i = 1; i < updatedAscData.length; i++) {
    TestValidator.predicate(
      "updatedAt asc - order correct",
      new Date(updatedAscData[i].updatedAt) >=
        new Date(updatedAscData[i - 1].updatedAt),
    );
  }
  // 11. Test sorting by updatedAt desc
  const sortedByUpdatedDesc =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberConnection,
      {
        body: {
          sortBy: "updatedAt",
          sortOrder: "desc",
          pageSize: 100,
          limit: 100,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(sortedByUpdatedDesc);
  const updatedDescData: IHrmPlatformTimeTrackingTimezone.ISummary[] =
    sortedByUpdatedDesc.data;
  for (let i = 1; i < updatedDescData.length; i++) {
    TestValidator.predicate(
      "updatedAt desc - order correct",
      new Date(updatedDescData[i].updatedAt) <=
        new Date(updatedDescData[i - 1].updatedAt),
    );
  }
}
