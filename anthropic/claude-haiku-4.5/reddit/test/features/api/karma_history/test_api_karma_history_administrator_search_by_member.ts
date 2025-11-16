import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test the administrator's ability to search and filter karma history records
 * for a specific member.
 *
 * Administrators should be able to retrieve all karma changes for a particular
 * member to audit their reputation progression. The test verifies that the
 * search filters work correctly by member ID, returning only karma history
 * records associated with that member. Validates that the response includes
 * complete karma history details with previous and new karma totals, change
 * reasons, timestamps, and reference IDs linking to source actions. Tests
 * pagination to ensure large karma history datasets can be navigated
 * efficiently. Verifies that the returned records are ordered correctly (newest
 * first by default) and that the pagination metadata correctly reflects total
 * records and pages.
 *
 * Test flow:
 *
 * 1. Create administrator account for accessing platform-wide karma history audit
 *    capabilities
 * 2. Create member account to establish baseline data
 * 3. Retrieve member's karma history first to establish baseline data that the
 *    administrator search should return
 * 4. Authenticate administrator to the platform
 * 5. Search for karma history records filtered by member ID using administrator
 *    endpoint
 * 6. Validate pagination metadata (current page, limit, total records, total
 *    pages)
 * 7. Validate that returned records contain complete karma history details
 * 8. Verify records are properly sorted by creation date (newest first by default)
 * 9. Test pagination by requesting different pages
 * 10. Verify that member-specific filtering works correctly
 */
export async function test_api_karma_history_administrator_search_by_member(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Retrieve member's karma history first to establish baseline data
  const memberKarmaHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.members.karmaHistory.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(memberKarmaHistory);

  // 4. Authenticate administrator (by logging in)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 5. Search for karma history records filtered by member ID using administrator endpoint
  const searchResult: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: member.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(searchResult);

  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be valid",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records should be valid",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages should be valid",
    searchResult.pagination.pages >= 0,
  );

  // 7. Validate that returned records contain complete karma history details
  if (searchResult.data.length > 0) {
    const firstRecord = searchResult.data[0];
    TestValidator.predicate(
      "karma history record has id",
      firstRecord.id !== undefined && firstRecord.id.length > 0,
    );
    TestValidator.predicate(
      "karma history record has member information",
      firstRecord.member !== undefined,
    );
    TestValidator.predicate(
      "karma history record has change reason",
      firstRecord.change_reason !== undefined,
    );
    TestValidator.predicate(
      "karma history record has karma change value",
      typeof firstRecord.karma_change === "number",
    );
    TestValidator.predicate(
      "karma history record has previous total",
      firstRecord.previous_total >= 0,
    );
    TestValidator.predicate(
      "karma history record has new total",
      firstRecord.new_total >= 0,
    );
    TestValidator.predicate(
      "karma history record has creation timestamp",
      firstRecord.created_at !== undefined,
    );
  }

  // 8. Verify records are properly sorted by creation date (newest first by default)
  if (searchResult.data.length > 1) {
    const firstDate = new Date(searchResult.data[0].created_at);
    const secondDate = new Date(searchResult.data[1].created_at);
    TestValidator.predicate(
      "records are sorted by creation date (newest first)",
      firstDate >= secondDate,
    );
  }

  // 9. Test pagination by requesting different pages
  if (searchResult.pagination.pages > 1) {
    const secondPageResult: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.administrator.karmaHistory.index(
        connection,
        {
          body: {
            member_id: member.id,
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(secondPageResult);
    TestValidator.predicate(
      "second page has correct page number",
      secondPageResult.pagination.current === 2,
    );
  }

  // 10. Verify that member-specific filtering works correctly
  TestValidator.predicate(
    "all returned records belong to the searched member",
    searchResult.data.every((record) => record.member.id === member.id),
  );
}
