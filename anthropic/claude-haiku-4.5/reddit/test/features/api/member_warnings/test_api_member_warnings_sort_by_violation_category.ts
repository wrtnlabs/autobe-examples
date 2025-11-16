import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberWarning";

/**
 * Test sorting member warnings by violation category alphabetically in
 * ascending and descending order.
 *
 * This test validates that the member warnings API correctly sorts results by
 * violation category name both alphabetically ascending (A-Z) and descending
 * (Z-A). The test creates an administrator account, creates multiple members,
 * issues warnings to each with different categories (harassment, spam,
 * hate_speech), and then queries the warnings API with
 * sortBy="violation_category" parameter using both ascending and descending
 * sort orders to verify proper alphabetical sorting.
 *
 * Test flow:
 *
 * 1. Create administrator account for accessing warnings management
 * 2. Create member 1 and issue warning with harassment category
 * 3. Create member 2 and issue warning with spam category
 * 4. Create member 3 and issue warning with hate_speech category
 * 5. Query warnings sorted by violation_category ascending (A-Z)
 * 6. Validate ascending sort order matches alphabetical sequence
 * 7. Query warnings sorted by violation_category descending (Z-A)
 * 8. Validate descending sort order matches reverse alphabetical sequence
 */
export async function test_api_member_warnings_sort_by_violation_category(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create member 1 and issue warning with harassment category
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  const warning1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member1.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);
  TestValidator.equals(
    "warning 1 violation category is harassment",
    warning1.violationCategory,
    "harassment",
  );

  // 3. Create member 2 and issue warning with spam category
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  const warning2: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member2.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "spam",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2);
  TestValidator.equals(
    "warning 2 violation category is spam",
    warning2.violationCategory,
    "spam",
  );

  // 4. Create member 3 and issue warning with hate_speech category
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  const warning3: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member3.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "hate_speech",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning3);
  TestValidator.equals(
    "warning 3 violation category is hate_speech",
    warning3.violationCategory,
    "hate_speech",
  );

  // 5. Query warnings sorted by violation_category ascending (A-Z)
  const ascendingResults: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sortBy: "violation_category",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(ascendingResults);

  // 6. Validate ascending sort order (A-Z)
  TestValidator.predicate(
    "ascending sort has at least 3 items",
    ascendingResults.data.length >= 3,
  );

  // Extract categories from ascending results
  const ascendingCategories = ascendingResults.data.map(
    (w) => w.violationCategory,
  );

  // Verify alphabetical ascending order
  for (let i = 0; i < ascendingCategories.length - 1; i++) {
    TestValidator.predicate(
      `ascending sort at index ${i}: '${ascendingCategories[i]}' <= '${ascendingCategories[i + 1]}'`,
      ascendingCategories[i].localeCompare(ascendingCategories[i + 1]) <= 0,
    );
  }

  // 7. Query warnings sorted by violation_category descending (Z-A)
  const descendingResults: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sortBy: "violation_category",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(descendingResults);

  // 8. Validate descending sort order (Z-A)
  TestValidator.predicate(
    "descending sort has at least 3 items",
    descendingResults.data.length >= 3,
  );

  // Extract categories from descending results
  const descendingCategories = descendingResults.data.map(
    (w) => w.violationCategory,
  );

  // Verify alphabetical descending order
  for (let i = 0; i < descendingCategories.length - 1; i++) {
    TestValidator.predicate(
      `descending sort at index ${i}: '${descendingCategories[i]}' >= '${descendingCategories[i + 1]}'`,
      descendingCategories[i].localeCompare(descendingCategories[i + 1]) >= 0,
    );
  }

  // Validate that descending is reverse of ascending
  TestValidator.predicate(
    "descending results are reverse of ascending",
    JSON.stringify(descendingCategories.reverse()) ===
      JSON.stringify(ascendingCategories),
  );
}
