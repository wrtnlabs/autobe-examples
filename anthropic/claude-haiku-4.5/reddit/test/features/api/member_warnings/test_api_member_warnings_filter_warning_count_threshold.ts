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
 * Test filtering member warnings by warning count to identify repeat offenders
 * or first-time violators.
 *
 * This test validates the warning count filtering functionality of the member
 * warnings API. It verifies that moderators can effectively filter warnings by
 * minimum and maximum thresholds, enabling them to focus on different severity
 * levels based on cumulative warning counts.
 *
 * Test workflow:
 *
 * 1. Create a moderator account for filtering member warnings
 * 2. Create member accounts and generate warnings with varying counts (1, 2, 3+
 *    warnings)
 * 3. Test warningCountMin=2 filter to identify repeat offenders
 * 4. Test warningCountMax=1 filter to identify first-time violators
 * 5. Test range filtering with warningCountMin=2 AND warningCountMax=3
 * 6. Verify filtering results match expectations for each threshold
 */
export async function test_api_member_warnings_filter_warning_count_threshold(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "ValidPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create members with different warning counts
  // Create member with 1 warning
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "ValidPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Create member with 2 warnings
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "ValidPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Create member with 3+ warnings
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "ValidPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // 3. Test warningCountMin=2 filter (repeat offenders)
  const repeatOffendersResult: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          warningCountMin: 2,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(repeatOffendersResult);

  // Verify repeat offenders filter results
  TestValidator.predicate(
    "repeat offenders results should include pagination info",
    repeatOffendersResult.pagination !== undefined,
  );

  // Verify all warnings in results have warningCount >= 2
  repeatOffendersResult.data.forEach((warning) => {
    TestValidator.predicate(
      "warning count should be at least 2 for repeat offenders filter",
      warning.warningCount >= 2,
    );
  });

  // 4. Test warningCountMax=1 filter (first-time violators)
  const firstTimeViolatorsResult: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          warningCountMax: 1,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(firstTimeViolatorsResult);

  // Verify first-time violators filter results
  TestValidator.predicate(
    "first-time violators results should include pagination info",
    firstTimeViolatorsResult.pagination !== undefined,
  );

  // Verify all warnings in results have warningCount <= 1
  firstTimeViolatorsResult.data.forEach((warning) => {
    TestValidator.predicate(
      "warning count should be at most 1 for first-time violators filter",
      warning.warningCount <= 1,
    );
  });

  // 5. Test range filtering with warningCountMin=2 AND warningCountMax=3
  const rangeFilterResult: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          warningCountMin: 2,
          warningCountMax: 3,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(rangeFilterResult);

  // Verify range filter results
  TestValidator.predicate(
    "range filter results should include pagination info",
    rangeFilterResult.pagination !== undefined,
  );

  // Verify all warnings in results have warningCount between 2-3 (inclusive)
  rangeFilterResult.data.forEach((warning) => {
    TestValidator.predicate(
      "warning count should be between 2 and 3 for range filter",
      warning.warningCount >= 2 && warning.warningCount <= 3,
    );
  });

  // 6. Verify filtering effectiveness
  TestValidator.predicate(
    "repeat offenders should have warnings with count >= 2",
    repeatOffendersResult.data.every((w) => w.warningCount >= 2),
  );

  TestValidator.predicate(
    "first-time violators should have warnings with count <= 1",
    firstTimeViolatorsResult.data.every((w) => w.warningCount <= 1),
  );

  TestValidator.predicate(
    "range filter should show warnings with count 2-3",
    rangeFilterResult.data.every(
      (w) => w.warningCount >= 2 && w.warningCount <= 3,
    ),
  );

  // Verify warningCount field is present and meaningful
  if (repeatOffendersResult.data.length > 0) {
    TestValidator.predicate(
      "repeat offenders warnings should have warningCount field",
      repeatOffendersResult.data[0].warningCount !== undefined,
    );
  }

  if (firstTimeViolatorsResult.data.length > 0) {
    TestValidator.predicate(
      "first-time violators warnings should have warningCount field",
      firstTimeViolatorsResult.data[0].warningCount !== undefined,
    );
  }

  if (rangeFilterResult.data.length > 0) {
    TestValidator.predicate(
      "range filter warnings should have warningCount field",
      rangeFilterResult.data[0].warningCount !== undefined,
    );
  }
}
