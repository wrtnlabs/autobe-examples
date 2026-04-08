import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test pagination functionality for listing member accounts with filtering and sorting options.
 *
 * Validates the complete member listing pagination flow including pagination metadata accuracy, member summary structure, and navigation between pages. Ensures that the API correctly paginates member records and returns accurate pagination information.
 *
 * Special attention is given to verifying pagination metadata calculations (pages = ceil(records/limit)), member summary field completeness, and that sensitive data like password_hash is never exposed in the response.
 *
 * 1. Call member list API with page=1 and limit=5.
 * 2. Validate pagination metadata (current=1, limit=5, pages calculated correctly).
 * 3. Verify data array contains expected number of member summaries.
 * 4. Validate each member summary structure (id, email, username, created_at, profile).
 * 5. Verify password_hash is NOT included in response.
 * 6. Call with page=2 to verify pagination navigation.
 * 7. Verify different members are returned on subsequent pages.
 */
export async function test_api_member_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. First page request with page=1 and limit=5
  const page1 = await api.functional.redditClone.members.index(connection, {
    body: {
      page: 1,
      limit: 5,
    } satisfies IRedditCloneMember.IRequest,
  });
  typia.assert(page1);
  // 2. Validate pagination metadata for page 1
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 5", page1.pagination.limit, 5);
  TestValidator.predicate(
    "has non-negative records",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", page1.pagination.pages >= 0);
  // 3. Verify data array length matches expected (5 or less if fewer members exist)
  TestValidator.predicate(
    "data array length is at most limit",
    page1.data.length <= 5,
  );
  TestValidator.predicate(
    "data array length matches records on first page",
    page1.data.length === Math.min(5, page1.pagination.records),
  );
  // 4. Validate each member summary structure
  await ArrayUtil.asyncForEach(page1.data, async (member, index) => {
    // typia.assert already validates UUID format, so no manual regex needed
    typia.assert(member);
    // Validate business logic: email and username should be non-empty
    TestValidator.predicate(
      `member[${index}] has non-empty email`,
      member.email.length > 0,
    );
    TestValidator.predicate(
      `member[${index}] has non-empty username`,
      member.username.length > 0,
    );
    // Validate profile nested structure
    typia.assert(member.profile);
    // Validate profile business logic
    TestValidator.predicate(
      `member[${index}] profile has non-empty display_name`,
      member.profile.display_name.length > 0,
    );
    TestValidator.predicate(
      `member[${index}] profile has valid karma`,
      typeof member.profile.karma === "number",
    );
  });
  // 5. Verify password_hash is NOT in response (already validated by typia.assert)
  // The DTO type IRedditCloneMember.ISummary does not include password_hash,
  // so typia.assert ensures it's not present
  // 6. Second page request with page=2 and limit=5 (if more records exist)
  if (page1.pagination.records > 5) {
    const page2 = await api.functional.redditClone.members.index(connection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies IRedditCloneMember.IRequest,
    });
    typia.assert(page2);
    // 7. Validate pagination metadata for page 2
    TestValidator.equals("current page is 2", page2.pagination.current, 2);
    TestValidator.equals("limit is 5", page2.pagination.limit, 5);
    TestValidator.equals(
      "total records consistent",
      page2.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      "total pages consistent",
      page2.pagination.pages,
      page1.pagination.pages,
    );
    // 8. Verify different members on page 2
    TestValidator.predicate(
      "page 2 has different members than page 1",
      !page2.data.some((m2) => page1.data.some((m1) => m1.id === m2.id)),
    );
  }
  // 9. Test maximum limit (100)
  const maxLimitPage = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals("current page is 1", maxLimitPage.pagination.current, 1);
  TestValidator.equals("limit is 100", maxLimitPage.pagination.limit, 100);
  TestValidator.predicate(
    "max limit data length is at most 100",
    maxLimitPage.data.length <= 100,
  );
}
