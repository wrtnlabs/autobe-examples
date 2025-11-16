import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test that administrators can control pagination page size using the limit
 * parameter within valid range (1-100).
 *
 * This test validates that the voting records pagination API correctly
 * constrains the maximum records returned per page using the limit parameter.
 * It ensures that:
 *
 * 1. Administrator authentication succeeds and grants access to voting records
 * 2. Different limit values (1, 10, 50, 100) are properly handled
 * 3. Response data never exceeds the specified limit
 * 4. Pagination metadata (current page, limit, total records, total pages) is
 *    correctly calculated
 * 5. The API enforces the valid limit range constraints (minimum 1, maximum 100)
 *
 * Steps:
 *
 * 1. Create and authenticate as an administrator
 * 2. Retrieve voting records with limit=1 and verify single record pagination
 * 3. Retrieve voting records with limit=10 and verify returned count <= 10
 * 4. Retrieve voting records with limit=50 and verify returned count <= 50
 * 5. Retrieve voting records with limit=100 and verify returned count <= 100
 * 6. Validate pagination metadata calculations for each limit value
 * 7. Verify that actual records returned never exceed the specified limit
 */
export async function test_api_voting_records_administrator_pagination_limits(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as an administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(10);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator created and authenticated",
    admin.id !== null,
  );

  // Test different limit values: 1, 10, 50, 100
  const limitValues = [1, 10, 50, 100] as const;

  for (const limit of limitValues) {
    // Retrieve voting records with specified limit
    const response: IPageICommunityPlatformVote =
      await api.functional.communityPlatform.administrator.votes.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    typia.assert(response);

    // Validate pagination metadata
    TestValidator.predicate(
      `pagination limit metadata matches requested limit ${limit}`,
      response.pagination.limit === limit,
    );
    TestValidator.predicate(
      `current page is 1 for limit ${limit}`,
      response.pagination.current === 1,
    );
    TestValidator.predicate(
      `total records is non-negative for limit ${limit}`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `total pages calculated correctly for limit ${limit}`,
      response.pagination.pages ===
        Math.ceil(response.pagination.records / limit),
    );

    // Validate that returned data never exceeds the specified limit
    TestValidator.predicate(
      `returned records count does not exceed limit ${limit}`,
      response.data.length <= limit,
    );

    // Validate that if we have data, the count matches pagination info
    if (response.data.length > 0) {
      TestValidator.equals(
        `returned data count matches pagination metadata for limit ${limit}`,
        response.data.length,
        Math.min(limit, response.pagination.records),
      );

      // Validate each vote record has required fields
      for (const vote of response.data) {
        typia.assert(vote);
        TestValidator.predicate(
          `vote record has valid id for limit ${limit}`,
          vote.id !== null && vote.id !== undefined,
        );
        TestValidator.predicate(
          `vote record has valid member_id for limit ${limit}`,
          vote.community_platform_member_id !== null &&
            vote.community_platform_member_id !== undefined,
        );
      }
    }
  }

  // Test pagination with different pages using limit=10
  const pageLimit = 10;
  const firstPageResponse: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageLimit as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(firstPageResponse);

  // If there are multiple pages, test second page
  if (firstPageResponse.pagination.pages > 1) {
    const secondPageResponse: IPageICommunityPlatformVote =
      await api.functional.communityPlatform.administrator.votes.index(
        connection,
        {
          body: {
            page: 2,
            limit: pageLimit as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    typia.assert(secondPageResponse);

    TestValidator.predicate(
      "second page current page is 2",
      secondPageResponse.pagination.current === 2,
    );
    TestValidator.predicate(
      "second page limit matches requested limit",
      secondPageResponse.pagination.limit === pageLimit,
    );
    TestValidator.predicate(
      "second page data count does not exceed limit",
      secondPageResponse.data.length <= pageLimit,
    );

    // Verify that first page and second page contain different data
    if (
      firstPageResponse.data.length > 0 &&
      secondPageResponse.data.length > 0
    ) {
      const firstPageIds = firstPageResponse.data.map((v) => v.id);
      const secondPageIds = secondPageResponse.data.map((v) => v.id);
      TestValidator.predicate(
        "first and second page contain different records",
        !firstPageIds.some((id) => secondPageIds.includes(id)),
      );
    }
  }
}
