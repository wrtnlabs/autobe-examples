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
 * Validate platform-wide system overview aggregation with a single active
 * setting.
 *
 * Business goal:
 *
 * - Ensure that when a platform administrator creates at least one active
 *   platform-wide setting, the system overview endpoint returns a coherent
 *   snapshot with non-empty statistics and well-formed section structures.
 *
 * High-level flow:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join.
 * 2. As that admin, create one active platform setting with a voting-related key
 *    via POST /communityPlatform/platformAdmin/platformSettings.
 * 3. Fetch the system overview via GET
 *    /communityPlatform/platformAdmin/systemOverview.
 * 4. Validate DTO shapes with typia.assert and perform business-level consistency
 *    checks:
 *
 *    - Statistics.active_settings_count >= 1
 *    - Statistics.last_updated_at is non-null and parsable as a date-time
 *    - Last_updated_at is not earlier than the created_at/updated_at of the created
 *         setting.
 *    - All sections (voting, karma, safety, statistics) exist and have a
 *         structurally valid shape.
 */
export async function test_api_system_overview_with_single_platform_setting(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and start an authenticated session.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a single active voting-related platform setting.
  const settingBody = {
    key: "voting.max_votes_per_day",
    value: "100",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const createdSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: settingBody },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(createdSetting);

  // Basic invariants on the created setting.
  TestValidator.predicate(
    "created platform setting is active",
    createdSetting.is_active === true,
  );
  TestValidator.predicate(
    "created platform setting is not soft-deleted",
    createdSetting.deleted_at === null ||
      createdSetting.deleted_at === undefined,
  );

  // 3. Retrieve the system overview as the same platform admin.
  const overview: ICommunityPlatformSystemOverview =
    await api.functional.communityPlatform.platformAdmin.systemOverview.at(
      connection,
    );
  typia.assert<ICommunityPlatformSystemOverview>(overview);

  const voting: ICommunityPlatformSystemOverviewVotingSection = overview.voting;
  const karma: ICommunityPlatformSystemOverviewKarmaSection = overview.karma;
  const safety: ICommunityPlatformSystemOverviewSafetySection = overview.safety;
  const statistics: ICommunityPlatformSystemOverviewStatisticsSection =
    overview.statistics;

  // 4. Section presence checks (shape already validated by typia.assert).
  TestValidator.predicate(
    "voting section must be present in overview",
    voting !== undefined && voting !== null,
  );
  TestValidator.predicate(
    "karma section must be present in overview",
    karma !== undefined && karma !== null,
  );
  TestValidator.predicate(
    "safety section must be present in overview",
    safety !== undefined && safety !== null,
  );
  TestValidator.predicate(
    "statistics section must be present in overview",
    statistics !== undefined && statistics !== null,
  );

  // Business-level statistics assertions.
  TestValidator.predicate(
    "active_settings_count should be at least 1 after creating one active setting",
    statistics.active_settings_count >= 1,
  );

  // last_updated_at should be non-null when there is at least one active setting.
  TestValidator.predicate(
    "statistics.last_updated_at must not be null when active settings exist",
    statistics.last_updated_at !== null,
  );

  // Parse timestamps to ensure ordering: last_updated_at >= createdSetting.updated_at.
  if (statistics.last_updated_at !== null) {
    const lastUpdatedMillis = Date.parse(statistics.last_updated_at);
    const createdUpdatedMillis = Date.parse(createdSetting.updated_at);

    TestValidator.predicate(
      "statistics.last_updated_at must be a valid date-time",
      Number.isFinite(lastUpdatedMillis),
    );
    TestValidator.predicate(
      "created setting updated_at must be a valid date-time",
      Number.isFinite(createdUpdatedMillis),
    );

    if (
      Number.isFinite(lastUpdatedMillis) &&
      Number.isFinite(createdUpdatedMillis)
    ) {
      TestValidator.predicate(
        "last_updated_at should be greater than or equal to created setting updated_at",
        lastUpdatedMillis >= createdUpdatedMillis,
      );
    }
  }
}
