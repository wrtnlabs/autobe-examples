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
 * Validates sorting of member warnings by warning count.
 *
 * Tests the ability to sort member warnings by cumulative warning count in both
 * ascending and descending order. This test validates that the warning search
 * and filtering endpoint correctly sorts warnings by the warningCount field,
 * enabling administrators to identify repeat offenders and manage disciplinary
 * escalation.
 *
 * Process:
 *
 * 1. Create administrator account for warning management
 * 2. Create first member and issue 1 warning
 * 3. Create second member and issue 2 warnings
 * 4. Create third member and issue 3 warnings
 * 5. Retrieve warnings sorted by warning_count ascending
 * 6. Verify correct ascending order by warning count
 * 7. Retrieve warnings sorted by warning_count descending
 * 8. Verify correct descending order by warning count
 */
export async function test_api_member_warnings_sort_by_warning_count(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { ...connection, headers: {} };
  const admin = await api.functional.auth.administrator.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Store admin authorization header
  const adminAuthHeader = adminConnection.headers?.Authorization || "";

  // 2. Create first member with 1 warning
  const memberConnection1: api.IConnection = { ...connection, headers: {} };
  const member1 = await api.functional.auth.member.join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Create first warning for member1 (warningCount = 1)
  const decision1: ICommunityPlatformReportDecision =
    typia.random<ICommunityPlatformReportDecision>();
  const warning1Connection: api.IConnection = {
    ...adminConnection,
    headers: { ...adminConnection.headers, Authorization: adminAuthHeader },
  };
  const warning1 =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      warning1Connection,
      {
        body: {
          communityPlatformMemberId: member1.id,
          communityPlatformReportDecisionId: decision1.id,
          violationCategory: "spam",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);

  // 3. Create second member with 2 warnings
  const memberConnection2: api.IConnection = { ...connection, headers: {} };
  const member2 = await api.functional.auth.member.join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Create first warning for member2 (warningCount = 1)
  const decision2a: ICommunityPlatformReportDecision =
    typia.random<ICommunityPlatformReportDecision>();
  const warning2aConnection: api.IConnection = {
    ...adminConnection,
    headers: { ...adminConnection.headers, Authorization: adminAuthHeader },
  };
  const warning2a =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      warning2aConnection,
      {
        body: {
          communityPlatformMemberId: member2.id,
          communityPlatformReportDecisionId: decision2a.id,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2a);

  // Create second warning for member2 (warningCount = 2)
  const decision2b: ICommunityPlatformReportDecision =
    typia.random<ICommunityPlatformReportDecision>();
  const warning2bConnection: api.IConnection = {
    ...adminConnection,
    headers: { ...adminConnection.headers, Authorization: adminAuthHeader },
  };
  const warning2b =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      warning2bConnection,
      {
        body: {
          communityPlatformMemberId: member2.id,
          communityPlatformReportDecisionId: decision2b.id,
          violationCategory: "off_topic",
          warningCount: 2,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2b);

  // 4. Create third member with 3 warnings
  const memberConnection3: api.IConnection = { ...connection, headers: {} };
  const member3 = await api.functional.auth.member.join(memberConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member3);

  // Create first warning for member3 (warningCount = 1)
  const decision3a: ICommunityPlatformReportDecision =
    typia.random<ICommunityPlatformReportDecision>();
  const warning3aConnection: api.IConnection = {
    ...adminConnection,
    headers: { ...adminConnection.headers, Authorization: adminAuthHeader },
  };
  const warning3a =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      warning3aConnection,
      {
        body: {
          communityPlatformMemberId: member3.id,
          communityPlatformReportDecisionId: decision3a.id,
          violationCategory: "misinformation",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning3a);

  // Create second warning for member3 (warningCount = 2)
  const decision3b: ICommunityPlatformReportDecision =
    typia.random<ICommunityPlatformReportDecision>();
  const warning3bConnection: api.IConnection = {
    ...adminConnection,
    headers: { ...adminConnection.headers, Authorization: adminAuthHeader },
  };
  const warning3b =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      warning3bConnection,
      {
        body: {
          communityPlatformMemberId: member3.id,
          communityPlatformReportDecisionId: decision3b.id,
          violationCategory: "commercial_spam",
          warningCount: 2,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning3b);

  // Create third warning for member3 (warningCount = 3)
  const decision3c: ICommunityPlatformReportDecision =
    typia.random<ICommunityPlatformReportDecision>();
  const warning3cConnection: api.IConnection = {
    ...adminConnection,
    headers: { ...adminConnection.headers, Authorization: adminAuthHeader },
  };
  const warning3c =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      warning3cConnection,
      {
        body: {
          communityPlatformMemberId: member3.id,
          communityPlatformReportDecisionId: decision3c.id,
          violationCategory: "impersonation",
          warningCount: 3,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning3c);

  // 5. Retrieve warnings sorted by warning_count ascending
  const ascendingConnection: api.IConnection = {
    ...adminConnection,
    headers: { ...adminConnection.headers, Authorization: adminAuthHeader },
  };
  const ascendingResult =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      ascendingConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sortBy: "warning_count",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // 6. Verify ascending order by warning count
  const ascendingWarnings = ascendingResult.data;
  TestValidator.predicate(
    "ascending sort should have results",
    ascendingWarnings.length > 0,
  );

  for (let i = 0; i < ascendingWarnings.length - 1; i++) {
    TestValidator.predicate(
      `warning at index ${i} should have warning count <= warning at index ${i + 1}`,
      ascendingWarnings[i].warningCount <=
        ascendingWarnings[i + 1].warningCount,
    );
  }

  // 7. Retrieve warnings sorted by warning_count descending
  const descendingConnection: api.IConnection = {
    ...adminConnection,
    headers: { ...adminConnection.headers, Authorization: adminAuthHeader },
  };
  const descendingResult =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      descendingConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sortBy: "warning_count",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(descendingResult);

  // 8. Verify descending order by warning count
  const descendingWarnings = descendingResult.data;
  TestValidator.predicate(
    "descending sort should have results",
    descendingWarnings.length > 0,
  );

  for (let i = 0; i < descendingWarnings.length - 1; i++) {
    TestValidator.predicate(
      `warning at index ${i} should have warning count >= warning at index ${i + 1}`,
      descendingWarnings[i].warningCount >=
        descendingWarnings[i + 1].warningCount,
    );
  }

  // Verify that both results contain the same warnings
  TestValidator.equals(
    "ascending and descending results should have same count",
    ascendingWarnings.length,
    descendingWarnings.length,
  );

  // Verify first ascending is smallest, last ascending is largest
  TestValidator.predicate(
    "first ascending warning should be <= last ascending warning",
    ascendingWarnings[0].warningCount <=
      ascendingWarnings[ascendingWarnings.length - 1].warningCount,
  );

  // Verify first descending is largest, last descending is smallest
  TestValidator.predicate(
    "first descending warning should be >= last descending warning",
    descendingWarnings[0].warningCount >=
      descendingWarnings[descendingWarnings.length - 1].warningCount,
  );
}
