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
 * Test filtering member warnings by violation category.
 *
 * This test validates that the member warnings search API correctly filters
 * warnings by violation category. The test creates an administrator account,
 * then creates multiple members and issues warnings with different violation
 * categories (harassment, spam, misinformation). It then performs searches
 * filtered by specific categories and verifies that the API returns only
 * warnings matching the requested category.
 *
 * The test validates:
 *
 * 1. Creating warnings with different violation categories
 * 2. Filtering warnings by single category
 * 3. Pagination respects category filters
 * 4. Multiple warnings can be created and filtered correctly
 */
export async function test_api_member_warnings_filter_by_violation_category(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create first member for harassment violation warning
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // 3. Create second member for spam violation warning
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // 4. Create third member for misinformation violation warning
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member3Email,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // 5. Create warnings with different violation categories
  // Using valid UUID for report decision IDs
  const reportDecisionId1 = typia.random<string & tags.Format<"uuid">>();
  const warning1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member1.id,
          communityPlatformReportDecisionId: reportDecisionId1,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);
  TestValidator.equals(
    "first warning violation category is harassment",
    warning1.violationCategory,
    "harassment",
  );

  // 6. Create warning with spam violation category
  const reportDecisionId2 = typia.random<string & tags.Format<"uuid">>();
  const warning2: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member2.id,
          communityPlatformReportDecisionId: reportDecisionId2,
          violationCategory: "spam",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2);
  TestValidator.equals(
    "second warning violation category is spam",
    warning2.violationCategory,
    "spam",
  );

  // 7. Create warning with misinformation violation category
  const reportDecisionId3 = typia.random<string & tags.Format<"uuid">>();
  const warning3: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member3.id,
          communityPlatformReportDecisionId: reportDecisionId3,
          violationCategory: "misinformation",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning3);
  TestValidator.equals(
    "third warning violation category is misinformation",
    warning3.violationCategory,
    "misinformation",
  );

  // 8. Filter warnings by harassment category
  const harassmentWarnings: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          violationCategory: "harassment",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(harassmentWarnings);
  TestValidator.predicate(
    "harassment filter returns at least one warning",
    harassmentWarnings.data.length >= 1,
  );
  TestValidator.predicate(
    "all harassment filtered warnings have harassment category",
    harassmentWarnings.data.every((w) => w.violationCategory === "harassment"),
  );

  // 9. Filter warnings by spam category
  const spamWarnings: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          violationCategory: "spam",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(spamWarnings);
  TestValidator.predicate(
    "spam filter returns at least one warning",
    spamWarnings.data.length >= 1,
  );
  TestValidator.predicate(
    "all spam filtered warnings have spam category",
    spamWarnings.data.every((w) => w.violationCategory === "spam"),
  );

  // 10. Filter warnings by misinformation category
  const misinformationWarnings: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          violationCategory: "misinformation",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(misinformationWarnings);
  TestValidator.predicate(
    "misinformation filter returns at least one warning",
    misinformationWarnings.data.length >= 1,
  );
  TestValidator.predicate(
    "all misinformation filtered warnings have misinformation category",
    misinformationWarnings.data.every(
      (w) => w.violationCategory === "misinformation",
    ),
  );

  // 11. Verify pagination respects category filter
  const paginatedHarassment: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
          violationCategory: "harassment",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(paginatedHarassment);
  TestValidator.equals(
    "pagination limit is respected",
    paginatedHarassment.data.length,
    1,
  );
  TestValidator.predicate(
    "paginated result has harassment category",
    paginatedHarassment.data.every((w) => w.violationCategory === "harassment"),
  );

  // 12. Test pagination info is correct
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedHarassment.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 1",
    paginatedHarassment.pagination.limit === 1,
  );
}
