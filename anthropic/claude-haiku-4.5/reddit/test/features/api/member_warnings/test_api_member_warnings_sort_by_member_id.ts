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

export async function test_api_member_warnings_sort_by_member_id(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace(/\+.*@/, "@"),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create first member
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace(/\+.*@/, "@"),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 3: Create second member
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace(/\+.*@/, "@"),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 4: Create third member
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace(/\+.*@/, "@"),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // Step 5: Create warning for first member with valid decision ID
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

  // Step 6: Create warning for second member
  const warning2: ICommunityPlatformMemberWarning =
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
  typia.assert(warning2);

  // Step 7: Create warning for third member
  const warning3: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member3.id,
          communityPlatformReportDecisionId: typia.random<
            string & tags.Format<"uuid">
          >(),
          violationCategory: "misinformation",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning3);

  // Step 8: Query warnings sorted by member_id in ascending order
  const ascendingResult: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sortBy: "member_id",
          sortOrder: "asc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 9: Verify ascending sort order
  const ascendingMemberIds = ascendingResult.data.map((w) => w.member.id);
  for (let i = 1; i < ascendingMemberIds.length; i++) {
    TestValidator.predicate(
      "ascending order: member IDs should be sorted from lowest to highest",
      ascendingMemberIds[i] >= ascendingMemberIds[i - 1],
    );
  }

  // Step 10: Query warnings sorted by member_id in descending order
  const descendingResult: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sortBy: "member_id",
          sortOrder: "desc",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 11: Verify descending sort order
  const descendingMemberIds = descendingResult.data.map((w) => w.member.id);
  for (let i = 1; i < descendingMemberIds.length; i++) {
    TestValidator.predicate(
      "descending order: member IDs should be sorted from highest to lowest",
      descendingMemberIds[i] <= descendingMemberIds[i - 1],
    );
  }

  // Step 12: Validate that warnings are returned in both queries
  TestValidator.predicate(
    "ascending and descending results should have consistent warning count",
    ascendingResult.data.length > 0 &&
      ascendingResult.data.length === descendingResult.data.length,
  );
}
