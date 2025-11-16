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

export async function test_api_member_warnings_combined_filters_and_sorting(
  connection: api.IConnection,
) {
  // Create administrator account for search access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create first member for spam violations
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphaNumeric(8),
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Create second member for mixed violations
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphaNumeric(8),
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Create third member for multiple warnings
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member3Email,
        username: RandomGenerator.alphaNumeric(8),
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // Create first spam warning for member1 (warning count: 1)
  const warning1: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member1.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "spam",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);

  // Create second spam warning for member1 (warning count: 2)
  const warning2: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member1.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "spam",
          warningCount: 2,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2);

  // Create harassment warning for member2 (warning count: 1)
  const warning3: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member2.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning3);

  // Create three spam warnings for member3 (warning counts: 3, 4, 5)
  const warning4: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member3.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "spam",
          warningCount: 3,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning4);

  const warning5: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member3.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "spam",
          warningCount: 4,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning5);

  const warning6: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member3.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "spam",
          warningCount: 5,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning6);

  // Test 1: Filter by member ID only
  const result1: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          memberId: member1.id,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals("member1 has 2 warnings", result1.data.length, 2);
  TestValidator.predicate(
    "all results belong to member1",
    result1.data.every((w) => w.member.id === member1.id),
  );

  // Test 2: Filter by violation category (spam)
  const result2: IPageICommunityPlatformMemberWarning.ISummary =
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
  typia.assert(result2);
  TestValidator.predicate(
    "all results are spam category",
    result2.data.every((w) => w.violationCategory === "spam"),
  );
  TestValidator.predicate(
    "spam results contain at least 5 warnings",
    result2.data.length >= 5,
  );

  // Test 3: Filter by warning count range (2-4)
  const result3: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          warningCountMin: 2,
          warningCountMax: 4,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(result3);
  TestValidator.predicate(
    "all warnings have count between 2 and 4",
    result3.data.every((w) => w.warningCount >= 2 && w.warningCount <= 4),
  );

  // Test 4: Combined filter - member1 AND spam category
  const result4: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          memberId: member1.id,
          violationCategory: "spam",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(result4);
  TestValidator.equals("member1 has 2 spam warnings", result4.data.length, 2);
  TestValidator.predicate(
    "all are member1 spam warnings",
    result4.data.every(
      (w) => w.member.id === member1.id && w.violationCategory === "spam",
    ),
  );

  // Test 5: Combined filter - spam AND warning count 2-4
  const result5: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          violationCategory: "spam",
          warningCountMin: 2,
          warningCountMax: 4,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(result5);
  TestValidator.predicate(
    "all are spam with warning count 2-4",
    result5.data.every(
      (w) =>
        w.violationCategory === "spam" &&
        w.warningCount >= 2 &&
        w.warningCount <= 4,
    ),
  );

  // Test 6: Combined filter - member3 AND spam AND warning count 3-5
  const result6: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          memberId: member3.id,
          violationCategory: "spam",
          warningCountMin: 3,
          warningCountMax: 5,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(result6);
  TestValidator.equals(
    "member3 has 3 spam warnings with count 3-5",
    result6.data.length,
    3,
  );
  TestValidator.predicate(
    "all match combined filters",
    result6.data.every(
      (w) =>
        w.member.id === member3.id &&
        w.violationCategory === "spam" &&
        w.warningCount >= 3 &&
        w.warningCount <= 5,
    ),
  );

  // Test 7: Sort by warning count ascending
  const result7: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
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
  typia.assert(result7);
  for (let i = 1; i < result7.data.length; i++) {
    TestValidator.predicate(
      `warning count ascending at position ${i}`,
      result7.data[i].warningCount >= result7.data[i - 1].warningCount,
    );
  }

  // Test 8: Sort by warning count descending
  const result8: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
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
  typia.assert(result8);
  for (let i = 1; i < result8.data.length; i++) {
    TestValidator.predicate(
      `warning count descending at position ${i}`,
      result8.data[i].warningCount <= result8.data[i - 1].warningCount,
    );
  }

  // Test 9: Sort by created_at ascending
  const result9: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
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
  typia.assert(result9);
  for (let i = 1; i < result9.data.length; i++) {
    TestValidator.predicate(
      `created_at ascending at position ${i}`,
      new Date(result9.data[i].createdAt) >=
        new Date(result9.data[i - 1].createdAt),
    );
  }

  // Test 10: Combined filter with sorting - member3 spam, sorted by warning count desc
  const result10: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          memberId: member3.id,
          violationCategory: "spam",
          sortBy: "warning_count",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(result10);
  TestValidator.equals("member3 has 3 spam warnings", result10.data.length, 3);
  TestValidator.predicate(
    "all are member3 spam",
    result10.data.every(
      (w) => w.member.id === member3.id && w.violationCategory === "spam",
    ),
  );
  for (let i = 1; i < result10.data.length; i++) {
    TestValidator.predicate(
      `sorted descending at position ${i} in filtered results`,
      result10.data[i].warningCount <= result10.data[i - 1].warningCount,
    );
  }

  // Test 11: Pagination with filters
  const result11a: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
          violationCategory: "spam",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(result11a);
  TestValidator.equals("page 1 returns 1 item", result11a.data.length, 1);

  const result11b: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 2,
          limit: 1,
          violationCategory: "spam",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(result11b);
  TestValidator.equals("page 2 returns 1 item", result11b.data.length, 1);
  TestValidator.notEquals(
    "different warnings on different pages",
    result11a.data[0].id,
    result11b.data[0].id,
  );

  // Test 12: Filter by harassment category
  const result12: IPageICommunityPlatformMemberWarning.ISummary =
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
  typia.assert(result12);
  TestValidator.equals("harassment warning count", result12.data.length, 1);
  TestValidator.equals(
    "harassment warning belongs to member2",
    result12.data[0].member.id,
    member2.id,
  );
}
