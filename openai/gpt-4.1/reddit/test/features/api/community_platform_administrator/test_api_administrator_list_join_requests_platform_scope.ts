import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityJoinRequest";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityJoinRequest";

/**
 * Validate that an administrator can retrieve a paginated, filtered list of
 * join requests for any community.
 *
 * Steps:
 *
 * 1. Register and login as a platform administrator.
 * 2. Test joinRequests list for various (random) community names and filtering
 *    criteria.
 * 3. Assert all paged responses are valid, filtering/sorting options are handled
 *    as per schema, and administrator can see results without access denial for
 *    any community.
 */
export async function test_api_administrator_list_join_requests_platform_scope(
  connection: api.IConnection,
) {
  // Step 1: Register and login as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: null,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  typia.assert(admin.token);

  // Step 2: Choose some random community name (as platform scope is being tested)
  const communityName = RandomGenerator.alphaNumeric(10);

  // Step 3: Test joinRequests index endpoint with various filtering/sorting
  // Try with multiple filter/search combinations
  const filterParamsList = [
    // Base (no filter, first page)
    {
      status: undefined,
      created_from: undefined,
      created_to: undefined,
      applicant_search: undefined,
      moderator_search: undefined,
      order_by: undefined,
      order_direction: undefined,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    // Filter by status
    {
      status: RandomGenerator.pick([
        "pending",
        "approved",
        "rejected",
        "expired",
      ] as const),
      created_from: undefined,
      created_to: undefined,
      applicant_search: undefined,
      moderator_search: undefined,
      order_by: "created_at",
      order_direction: RandomGenerator.pick(["asc", "desc"] as const),
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    // Filter with applicant_search keyword
    {
      status: undefined,
      created_from: undefined,
      created_to: undefined,
      applicant_search: RandomGenerator.name(1),
      moderator_search: undefined,
      order_by: "status",
      order_direction: RandomGenerator.pick(["asc", "desc"] as const),
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    // Filter with date-range (simulate plausible recent times)
    {
      status: "pending",
      created_from: new Date(
        Date.now() - 1000 * 60 * 60 * 24 * 30,
      ).toISOString() as string & tags.Format<"date-time">,
      created_to: new Date().toISOString() as string & tags.Format<"date-time">,
      applicant_search: undefined,
      moderator_search: undefined,
      order_by: "created_at",
      order_direction: "desc",
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
  ];
  for (const filterParams of filterParamsList) {
    const pageResult =
      await api.functional.communityPlatform.administrator.communities.joinRequests.index(
        connection,
        {
          communityName,
          body: filterParams as ICommunityPlatformCommunityJoinRequest.IRequest,
        },
      );
    typia.assert(pageResult);
    // Check page is type-safe
    TestValidator.predicate(
      "pagination info is present",
      !!pageResult.pagination,
    );
    TestValidator.predicate(
      "data array is present",
      Array.isArray(pageResult.data),
    );
    // Check each entry is type-safe and has community matching communityName
    for (const jr of pageResult.data) {
      typia.assert(jr);
      TestValidator.equals(
        "community name in join request matches request communityName",
        jr.community.name,
        communityName,
      );
      TestValidator.predicate(
        "join request status is valid",
        ["pending", "approved", "rejected", "expired"].includes(jr.status),
      );
    }
  }
  // Try with an arbitrary (likely non-existent) communityName for access boundary:
  const anyCommunityName = RandomGenerator.alphaNumeric(12);
  const result =
    await api.functional.communityPlatform.administrator.communities.joinRequests.index(
      connection,
      {
        communityName: anyCommunityName,
        body: {
          status: undefined,
          created_from: undefined,
          created_to: undefined,
          applicant_search: undefined,
          moderator_search: undefined,
          order_by: undefined,
          order_direction: undefined,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } as ICommunityPlatformCommunityJoinRequest.IRequest,
      },
    );
  typia.assert(result);
  // Assert that response is valid (empty or otherwise, never error)
  TestValidator.predicate(
    "arbitrary communityName is accepted for administrator",
    Array.isArray(result.data),
  );
}
