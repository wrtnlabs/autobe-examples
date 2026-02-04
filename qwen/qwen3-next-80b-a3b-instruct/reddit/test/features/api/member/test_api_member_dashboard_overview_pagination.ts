import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_dashboard_overview_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Get the dashboard overview - this will return the single page response
  const dashboardOverview: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.member.dashboard.members.overview.index(
      memberConnection,
    );
  typia.assert(dashboardOverview);
  // Step 3: Validate pagination metadata structure and types
  // Use typia.assert to validate the entire pagination object against its schema
  typia.assert<IPage.IPagination>(dashboardOverview.pagination);
  // Validate pagination properties with domain-specific validation
  TestValidator.equals(
    "current page should be 1",
    dashboardOverview.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    dashboardOverview.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be >= 0",
    dashboardOverview.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be >= 0",
    dashboardOverview.pagination.pages >= 0,
  );
  // Step 4: Validate data array structure
  TestValidator.equals(
    "data array should be an array",
    Array.isArray(dashboardOverview.data),
    true,
  );
  TestValidator.predicate(
    "data array should have up to limit items",
    dashboardOverview.data.length <= dashboardOverview.pagination.limit,
  );
  // Step 5: Validate each member summary has correct structure (empty object)
  for (const member of dashboardOverview.data) {
    TestValidator.equals("member should be an object", typeof member, "object");
    TestValidator.equals(
      "member should be empty object as per ISummary",
      Object.keys(member).length,
      0,
    );
  }
  // Step 6: Validate consistency between pagination and data
  // Note: Since the API doesn't allow pagination parameters, we are testing the structure of a single response
  TestValidator.predicate(
    "total pages should be 1",
    dashboardOverview.pagination.pages === 1,
  );
  TestValidator.equals(
    "total records should match data length",
    dashboardOverview.pagination.records,
    dashboardOverview.data.length,
  );
}
