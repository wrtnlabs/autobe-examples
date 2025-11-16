import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformSystemOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverview";
import type { ICommunityPlatformSystemOverviewKarmaSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverviewKarmaSection";
import type { ICommunityPlatformSystemOverviewSafetySection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverviewSafetySection";
import type { ICommunityPlatformSystemOverviewStatisticsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverviewStatisticsSection";
import type { ICommunityPlatformSystemOverviewVotingSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverviewVotingSection";

/**
 * Verify that system overview reflects platform settings creation and update
 * over time.
 *
 * Business goal:
 *
 * - Ensure that GET /communityPlatform/platformAdmin/systemOverview returns a
 *   dynamic snapshot that reflects current active platform settings, and that
 *   statistics (active_settings_count, last_updated_at) behave correctly when a
 *   setting is updated but not added/removed.
 *
 * High-level steps:
 *
 * 1. Register a new platform admin and obtain authenticated connection.
 * 2. Create two specific platform settings:
 *
 *    - Voting.max_votes_per_day = "50", active.
 *    - Safety.report_rate_limit_per_hour = "20", active.
 * 3. Fetch the system overview and validate that voting and safety sections expose
 *    the expected numeric values, and statistics reflects active settings.
 * 4. Update the voting setting value to "100" using its id.
 * 5. Fetch the system overview again and verify that:
 *
 *    - Voting.max_votes_per_day is now 100.
 *    - Active_settings_count did not change.
 *    - Last_updated_at is monotonically non-decreasing.
 */
export async function test_api_system_overview_after_multiple_settings_updates(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (also sets Authorization header via SDK).
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.community.local/register",
    referrer: "https://admin.community.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(
    adminAuthorized.accountStatus,
  );

  // 2. Create two platform settings: voting and safety.
  const votingCreateBody = {
    key: "voting.max_votes_per_day",
    value: "50",
    description:
      "Maximum number of votes a member can cast across posts and comments in a 24-hour window.",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const safetyCreateBody = {
    key: "safety.report_rate_limit_per_hour",
    value: "20",
    description:
      "Maximum number of abuse or content reports a single member can submit per hour.",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const votingSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: votingCreateBody },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(votingSetting);

  const safetySetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: safetyCreateBody },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(safetySetting);

  // 3. Fetch initial system overview and validate.
  const initialOverview: ICommunityPlatformSystemOverview =
    await api.functional.communityPlatform.platformAdmin.systemOverview.at(
      connection,
    );
  typia.assert<ICommunityPlatformSystemOverview>(initialOverview);

  const initialVoting: ICommunityPlatformSystemOverviewVotingSection =
    initialOverview.voting;
  const initialSafety: ICommunityPlatformSystemOverviewSafetySection =
    initialOverview.safety;
  const initialStats: ICommunityPlatformSystemOverviewStatisticsSection =
    initialOverview.statistics;

  // Business validations for initial overview.
  // Ensure voting.max_votes_per_day is present and equals 50.
  TestValidator.predicate(
    "initial voting.max_votes_per_day must be defined",
    initialVoting.max_votes_per_day !== undefined,
  );
  if (initialVoting.max_votes_per_day !== undefined) {
    TestValidator.equals(
      "initial voting.max_votes_per_day must equal 50",
      initialVoting.max_votes_per_day,
      50,
    );
  }

  // Ensure safety.report_rate_limit_per_hour equals 20.
  TestValidator.equals(
    "initial safety.report_rate_limit_per_hour must equal 20",
    initialSafety.report_rate_limit_per_hour,
    20,
  );

  // active_settings_count should be at least 2 (our two active settings plus any pre-existing).
  TestValidator.predicate(
    "active_settings_count should be at least 2 after creating two active settings",
    initialStats.active_settings_count >= 2,
  );

  // last_updated_at should be non-null when there are active settings.
  TestValidator.predicate(
    "last_updated_at should not be null when active_settings_count > 0",
    initialStats.last_updated_at !== null,
  );

  const initialLastUpdatedAt: string | null = initialStats.last_updated_at;

  // 4. Update the voting setting value from "50" to "100".
  const votingUpdateBody = {
    // Do not change key/description/is_active to avoid affecting active count.
    value: "100",
  } satisfies ICommunityPlatformPlatformSetting.IUpdate;

  const updatedVotingSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.update(
      connection,
      {
        platformSettingId: votingSetting.id,
        body: votingUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(updatedVotingSetting);

  // 5. Fetch the system overview again after update.
  const updatedOverview: ICommunityPlatformSystemOverview =
    await api.functional.communityPlatform.platformAdmin.systemOverview.at(
      connection,
    );
  typia.assert<ICommunityPlatformSystemOverview>(updatedOverview);

  const updatedVoting: ICommunityPlatformSystemOverviewVotingSection =
    updatedOverview.voting;
  const updatedSafety: ICommunityPlatformSystemOverviewSafetySection =
    updatedOverview.safety;
  const updatedStats: ICommunityPlatformSystemOverviewStatisticsSection =
    updatedOverview.statistics;

  // Assert that safety configuration remains as before.
  TestValidator.equals(
    "safety.report_rate_limit_per_hour should remain 20 after unrelated voting update",
    updatedSafety.report_rate_limit_per_hour,
    20,
  );

  // Assert that voting configuration reflects updated max_votes_per_day = 100.
  TestValidator.predicate(
    "updated voting.max_votes_per_day must be defined",
    updatedVoting.max_votes_per_day !== undefined,
  );
  if (updatedVoting.max_votes_per_day !== undefined) {
    TestValidator.equals(
      "updated voting.max_votes_per_day must equal 100",
      updatedVoting.max_votes_per_day,
      100,
    );
  }

  // active_settings_count should not change between initial and updated overviews.
  TestValidator.equals(
    "active_settings_count must remain unchanged after updating a setting",
    updatedStats.active_settings_count,
    initialStats.active_settings_count,
  );

  // last_updated_at should be >= initial last_updated_at when both are non-null.
  if (initialLastUpdatedAt !== null && updatedStats.last_updated_at !== null) {
    const initialTime = Date.parse(initialLastUpdatedAt);
    const updatedTime = Date.parse(updatedStats.last_updated_at);

    TestValidator.predicate(
      "last_updated_at after update should be greater than or equal to initial",
      updatedTime >= initialTime,
    );
  }
}
