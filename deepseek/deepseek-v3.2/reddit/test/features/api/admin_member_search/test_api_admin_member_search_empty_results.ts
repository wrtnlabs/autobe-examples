import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test edge case: search with criteria that yields no results.
 * Admin should receive empty data array with correct pagination metadata
 * when no members match search criteria.
 *
 * Test scenarios:
 * 1) Search for non-existent email
 * 2) Username pattern with no matches
 * 3) Date range with no registrations
 * 4) Combination that cannot match any member
 *
 * Validate that:
 * 1) Empty data array is returned
 * 2) Pagination metadata shows records: 0, pages: 0
 * 3) Current page and limit values are preserved
 * 4) No error occurs for empty results
 *
 * Also test boundary cases: limit set to minimum (1) and maximum (100),
 * invalid date ranges should be handled gracefully by the framework validation.
 */
export async function test_api_admin_member_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Test scenario 1: Search for non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const scenario1Response =
    await api.functional.communityPlatform.members.index(adminConnection, {
      body: {
        email: nonExistentEmail,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(scenario1Response);
  TestValidator.equals(
    "scenario1: empty data array for non-existent email",
    scenario1Response.data,
    [],
  );
  TestValidator.equals(
    "scenario1: pagination records zero for non-existent email",
    scenario1Response.pagination.records,
    0,
  );
  TestValidator.equals(
    "scenario1: pagination pages zero for non-existent email",
    scenario1Response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "scenario1: current page preserved",
    scenario1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "scenario1: default limit preserved",
    scenario1Response.pagination.limit,
    20,
  );
  // 3. Test scenario 2: Username pattern with no matches
  const nonMatchingUsernamePattern = `nonexistent_${RandomGenerator.alphabets(10)}`;
  const scenario2Response =
    await api.functional.communityPlatform.members.index(adminConnection, {
      body: {
        username: nonMatchingUsernamePattern,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(scenario2Response);
  TestValidator.equals(
    "scenario2: empty data array for non-matching username pattern",
    scenario2Response.data,
    [],
  );
  TestValidator.equals(
    "scenario2: pagination records zero for non-matching username pattern",
    scenario2Response.pagination.records,
    0,
  );
  TestValidator.equals(
    "scenario2: pagination pages zero for non-matching username pattern",
    scenario2Response.pagination.pages,
    0,
  );
  // 4. Test scenario 3: Date range with no registrations (future date)
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const scenario3Response =
    await api.functional.communityPlatform.members.index(adminConnection, {
      body: {
        registered_at_min: futureDate,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(scenario3Response);
  TestValidator.equals(
    "scenario3: empty data array for future registration date",
    scenario3Response.data,
    [],
  );
  TestValidator.equals(
    "scenario3: pagination records zero for future registration date",
    scenario3Response.pagination.records,
    0,
  );
  TestValidator.equals(
    "scenario3: pagination pages zero for future registration date",
    scenario3Response.pagination.pages,
    0,
  );
  // 5. Test scenario 4: Combination that cannot match any member
  const scenario4Response =
    await api.functional.communityPlatform.members.index(adminConnection, {
      body: {
        email: nonExistentEmail,
        username: nonMatchingUsernamePattern,
        registered_at_min: futureDate,
        email_verified: true,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(scenario4Response);
  TestValidator.equals(
    "scenario4: empty data array for impossible combination",
    scenario4Response.data,
    [],
  );
  TestValidator.equals(
    "scenario4: pagination records zero for impossible combination",
    scenario4Response.pagination.records,
    0,
  );
  TestValidator.equals(
    "scenario4: pagination pages zero for impossible combination",
    scenario4Response.pagination.pages,
    0,
  );
  // 6. Test boundary cases: minimum and maximum limit values
  // Test with limit = 1 (minimum)
  const minLimitResponse = await api.functional.communityPlatform.members.index(
    adminConnection,
    {
      body: {
        email: nonExistentEmail,
        limit: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit: empty data array",
    minLimitResponse.data,
    [],
  );
  TestValidator.equals(
    "min limit: limit preserved as 1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.equals(
    "min limit: records zero",
    minLimitResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "min limit: pages zero",
    minLimitResponse.pagination.pages,
    0,
  );
  // Test with limit = 100 (maximum)
  const maxLimitResponse = await api.functional.communityPlatform.members.index(
    adminConnection,
    {
      body: {
        email: nonExistentEmail,
        limit: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit: empty data array",
    maxLimitResponse.data,
    [],
  );
  TestValidator.equals(
    "max limit: limit preserved as 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit: records zero",
    maxLimitResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "max limit: pages zero",
    maxLimitResponse.pagination.pages,
    0,
  );
  // 7. Test with explicit page parameter
  const pageResponse = await api.functional.communityPlatform.members.index(
    adminConnection,
    {
      body: {
        email: nonExistentEmail,
        page: 3 satisfies number &
          tags.Type<"int32"> &
          tags.Default<1> &
          tags.Minimum<1>,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(pageResponse);
  TestValidator.equals("page param: empty data array", pageResponse.data, []);
  TestValidator.equals(
    "page param: current page preserved as 3",
    pageResponse.pagination.current,
    3,
  );
  TestValidator.equals(
    "page param: records zero",
    pageResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "page param: pages zero",
    pageResponse.pagination.pages,
    0,
  );
}
