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
 * Validate basic pagination and retrieval of member warnings list.
 *
 * This test verifies that administrators can search and retrieve member
 * warnings with proper pagination support. The test validates that:
 *
 * 1. Administrator can authenticate and access the warnings search endpoint
 * 2. Pagination metadata is correctly returned (page, limit, total records, total
 *    pages)
 * 3. Warning summaries include all essential fields (id, member, violation
 *    category, warning count, creation date, expiration status)
 * 4. Results maintain proper pagination structure across multiple page requests
 * 5. Filtering by violation category works correctly
 * 6. Results are sorted by creation date in descending order (newest first)
 */
export async function test_api_member_warnings_search_basic_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphabets(12);
  const administratorUsername = RandomGenerator.alphabets(8);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        username: administratorUsername,
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Store administrator token for subsequent calls
  const adminToken = administrator.token.access;

  // Step 2: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 3: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 4: Set connection to use administrator token for subsequent API calls
  connection.headers ??= {};
  connection.headers.Authorization = adminToken;

  // Step 5: Create first warning record for member1
  const reportDecisionId1 = typia.random<string & tags.Format<"uuid">>();
  const warning1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member1.id,
          communityPlatformReportDecisionId: reportDecisionId1,
          violationCategory: "spam",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);

  // Step 6: Create second warning record for member2
  const reportDecisionId2 = typia.random<string & tags.Format<"uuid">>();
  const warning2: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member2.id,
          communityPlatformReportDecisionId: reportDecisionId2,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2);

  // Step 7: Search warnings with basic pagination (page 1, limit 10)
  const warningsPage1: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(warningsPage1);

  // Step 8: Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    warningsPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    warningsPage1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be at least 2",
    warningsPage1.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    warningsPage1.pagination.pages >=
      Math.ceil(
        warningsPage1.pagination.records / warningsPage1.pagination.limit,
      ),
  );

  // Step 9: Validate warning summaries structure
  TestValidator.predicate(
    "warnings data array exists",
    Array.isArray(warningsPage1.data),
  );
  TestValidator.predicate(
    "at least one warning returned",
    warningsPage1.data.length > 0,
  );

  // Step 10: Validate individual warning summary fields
  for (const warning of warningsPage1.data) {
    TestValidator.predicate(
      "warning has id field",
      typeof warning.id === "string",
    );
    TestValidator.predicate(
      "warning has member field",
      warning.member !== undefined && warning.member !== null,
    );
    TestValidator.predicate(
      "warning has violationCategory field",
      typeof warning.violationCategory === "string",
    );
    TestValidator.predicate(
      "warning has warningCount field",
      typeof warning.warningCount === "number" && warning.warningCount >= 1,
    );
    TestValidator.predicate(
      "warning has createdAt field",
      typeof warning.createdAt === "string",
    );
    TestValidator.predicate(
      "warning has isExpired field",
      typeof warning.isExpired === "boolean",
    );
  }

  // Step 11: Validate sorting by creation date (descending - newest first)
  if (warningsPage1.data.length > 1) {
    const dates = warningsPage1.data.map((w) =>
      new Date(w.createdAt).getTime(),
    );
    for (let i = 0; i < dates.length - 1; i++) {
      TestValidator.predicate(
        `warning at index ${i} is newer than or equal to warning at index ${i + 1}`,
        dates[i] >= dates[i + 1],
      );
    }
  }

  // Step 12: Search warnings with smaller page size (page 1, limit 1)
  const warningsSmallPage: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(warningsSmallPage);

  // Step 13: Validate smaller page size returns at most 1 item
  TestValidator.predicate(
    "small page returns at most 1 item",
    warningsSmallPage.data.length <= 1,
  );

  // Step 14: Navigate to page 2 if available
  if (warningsSmallPage.pagination.pages > 1) {
    const warningsPage2: IPageICommunityPlatformMemberWarning.ISummary =
      await api.functional.communityPlatform.administrator.memberWarnings.index(
        connection,
        {
          body: {
            page: 2,
            limit: 1,
          } satisfies ICommunityPlatformMemberWarning.IRequest,
        },
      );
    typia.assert(warningsPage2);

    TestValidator.equals(
      "pagination current page is 2",
      warningsPage2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 should have different warning than page 1",
      warningsPage2.data.length === 0 ||
        (warningsSmallPage.data.length > 0 &&
          warningsSmallPage.data[0].id !== warningsPage2.data[0].id),
    );
  }

  // Step 15: Search with violation category filter
  const spamWarnings: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          violationCategory: "spam",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(spamWarnings);

  // Step 16: Validate filtered results contain only spam category
  for (const warning of spamWarnings.data) {
    TestValidator.equals(
      "all filtered warnings have spam category",
      warning.violationCategory,
      "spam",
    );
  }

  // Step 17: Search with member ID filter
  const member1Warnings: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          memberId: member1.id,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(member1Warnings);

  // Step 18: Validate member filter returns only member1's warnings
  for (const warning of member1Warnings.data) {
    TestValidator.equals(
      "all filtered warnings belong to member1",
      warning.member.id,
      member1.id,
    );
  }
}
