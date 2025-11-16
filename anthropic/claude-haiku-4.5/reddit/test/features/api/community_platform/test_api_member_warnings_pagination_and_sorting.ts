import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberWarning";

/**
 * Test pagination and sorting functionality for member warnings list retrieval.
 *
 * This test validates that the member warnings API correctly handles pagination
 * parameters (page, limit) and sorting options (sortBy, sortOrder). It verifies
 * that moderators can efficiently navigate and organize large warning datasets
 * through proper pagination mechanics and multiple sorting strategies.
 *
 * Test workflow:
 *
 * 1. Create moderator account to authenticate for warning API access
 * 2. Call member warnings API with pagination (page 1, limit 10)
 * 3. Validate pagination metadata (current page, limit, total records, total
 *    pages)
 * 4. Call member warnings API with page 2 to verify different results
 * 5. Verify no overlapping warning IDs between pages
 * 6. Test sorting by created_at in descending order (newest first)
 * 7. Test sorting by created_at in ascending order (oldest first)
 * 8. Test sorting by violation_category in ascending order (alphabetical)
 * 9. Test sorting by violation_category in descending order (reverse alphabetical)
 * 10. Test sorting by warning_count in descending order (repeat offenders first)
 * 11. Test sorting by warning_count in ascending order (least offenders first)
 */
export async function test_api_member_warnings_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Request first page of warnings with page=1, limit=10
  const page1Response =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(page1Response);

  // Step 3: Validate pagination metadata for first page
  TestValidator.equals(
    "first page current should be 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 10",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page data array length should be within limit",
    () => page1Response.data.length > 0 && page1Response.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination pages count should be positive",
    () => page1Response.pagination.pages > 0,
  );
  TestValidator.predicate(
    "total records should be at least as many as current page data",
    () => page1Response.pagination.records >= page1Response.data.length,
  );

  // Step 4: Request second page if available
  if (page1Response.pagination.pages >= 2) {
    const page2Response =
      await api.functional.communityPlatform.moderator.memberWarnings.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformMemberWarning.IRequest,
        },
      );
    typia.assert(page2Response);

    TestValidator.equals(
      "second page current should be 2",
      page2Response.pagination.current,
      2,
    );

    // Step 5: Verify no overlapping IDs between page 1 and page 2
    const page1Ids = new Set(page1Response.data.map((w) => w.id));
    const page2Ids = new Set(page2Response.data.map((w) => w.id));
    const hasOverlap = ArrayUtil.has(Array.from(page2Ids), (id) =>
      page1Ids.has(id),
    );
    TestValidator.predicate(
      "page 2 should not have overlapping warning IDs with page 1",
      () => !hasOverlap,
    );
  }

  // Step 6: Test sorting by created_at descending (newest first)
  const descByDateResponse =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(descByDateResponse);

  for (let i = 0; i < descByDateResponse.data.length - 1; i++) {
    const current = new Date(descByDateResponse.data[i].createdAt).getTime();
    const next = new Date(descByDateResponse.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `descending date sort: warning ${i} createdAt should be >= warning ${i + 1}`,
      () => current >= next,
    );
  }

  // Step 7: Test sorting by created_at ascending (oldest first)
  const ascByDateResponse =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(ascByDateResponse);

  for (let i = 0; i < ascByDateResponse.data.length - 1; i++) {
    const current = new Date(ascByDateResponse.data[i].createdAt).getTime();
    const next = new Date(ascByDateResponse.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `ascending date sort: warning ${i} createdAt should be <= warning ${i + 1}`,
      () => current <= next,
    );
  }

  // Step 8: Test sorting by violation_category ascending (A-Z)
  const ascByCategoryResponse =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "violation_category",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(ascByCategoryResponse);

  for (let i = 0; i < ascByCategoryResponse.data.length - 1; i++) {
    const current = ascByCategoryResponse.data[i].violationCategory;
    const next = ascByCategoryResponse.data[i + 1].violationCategory;
    TestValidator.predicate(
      `ascending category sort: category ${i} should be alphabetically <= category ${i + 1}`,
      () => current.localeCompare(next) <= 0,
    );
  }

  // Step 9: Test sorting by violation_category descending (Z-A)
  const descByCategoryResponse =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "violation_category",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(descByCategoryResponse);

  for (let i = 0; i < descByCategoryResponse.data.length - 1; i++) {
    const current = descByCategoryResponse.data[i].violationCategory;
    const next = descByCategoryResponse.data[i + 1].violationCategory;
    TestValidator.predicate(
      `descending category sort: category ${i} should be alphabetically >= category ${i + 1}`,
      () => current.localeCompare(next) >= 0,
    );
  }

  // Step 10: Test sorting by warning_count descending (repeat offenders first)
  const descByCountResponse =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "warning_count",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(descByCountResponse);

  for (let i = 0; i < descByCountResponse.data.length - 1; i++) {
    const current = descByCountResponse.data[i].warningCount;
    const next = descByCountResponse.data[i + 1].warningCount;
    TestValidator.predicate(
      `descending warning count sort: count ${i} should be >= count ${i + 1}`,
      () => current >= next,
    );
  }

  // Step 11: Test sorting by warning_count ascending (least offenders first)
  const ascByCountResponse =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "warning_count",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(ascByCountResponse);

  for (let i = 0; i < ascByCountResponse.data.length - 1; i++) {
    const current = ascByCountResponse.data[i].warningCount;
    const next = ascByCountResponse.data[i + 1].warningCount;
    TestValidator.predicate(
      `ascending warning count sort: count ${i} should be <= count ${i + 1}`,
      () => current <= next,
    );
  }
}
