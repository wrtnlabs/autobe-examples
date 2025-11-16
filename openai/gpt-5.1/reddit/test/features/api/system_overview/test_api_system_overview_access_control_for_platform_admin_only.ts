import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformSystemOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverview";
import type { ICommunityPlatformSystemOverviewKarmaSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverviewKarmaSection";
import type { ICommunityPlatformSystemOverviewSafetySection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverviewSafetySection";
import type { ICommunityPlatformSystemOverviewStatisticsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverviewStatisticsSection";
import type { ICommunityPlatformSystemOverviewVotingSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverviewVotingSection";

/**
 * Validate that only platform administrators can access the system overview
 * endpoint.
 *
 * Business purpose
 *
 * - The system overview aggregates sensitive platform-wide configuration, so it
 *   must only be available to platformAdmin actors.
 * - Regular member users should not be able to read this configuration snapshot
 *   even though they are authenticated users.
 *
 * Scenario
 *
 * 1. Join as platformAdmin
 *
 *    - Call api.functional.auth.platformAdmin.join with a randomly generated
 *         ICommunityPlatformPlatformadmin.IJoin request body.
 *    - Rely on the SDK to set the Authorization header with the admin access token.
 *    - Assert that the returned ICommunityPlatformPlatformadmin.IAuthorized object
 *         is valid.
 * 2. Create at least one platform setting as admin
 *
 *    - Call api.functional.communityPlatform.platformAdmin.platformSettings.create
 *         with a ICommunityPlatformPlatformSetting.ICreate body that defines a
 *         unique key, some string value, a human-readable description and
 *         is_active=true.
 *    - Assert that the created ICommunityPlatformPlatformSetting echoes these
 *         fields, especially key, value, description, is_active=true, and has
 *         non-null id and timestamps.
 * 3. Fetch system overview as admin (happy path)
 *
 *    - Call api.functional.communityPlatform.platformAdmin.systemOverview.at.
 *    - Assert that the response conforms to ICommunityPlatformSystemOverview.
 *    - Optionally check light business invariants like
 *         statistics.active_settings_count >= 1, because we have just created
 *         one active setting (the backend may also have seed data, so we only
 *         assert lower bound, not exact count).
 * 4. Join as member user (non-admin)
 *
 *    - Call api.functional.auth.memberUser.join with a randomly generated
 *         ICommunityPlatformMemberuser.IJoinRequest body.
 *    - This call overwrites the connection Authorization header with a member token.
 *    - Assert that the returned ICommunityPlatformMemberuser.IAuthorized is valid.
 * 5. Attempt system overview as member user (should be denied)
 *
 *    - With the same connection (now authenticated as memberUser), invoke
 *         api.functional.communityPlatform.platformAdmin.systemOverview.at
 *         again.
 *    - Wrap this call in TestValidator.error with an async closure to assert that
 *         the call fails and throws some error (likely HttpError) due to lack
 *         of platformAdmin privileges.
 *    - Do not assert on exact HTTP status, error type, or message.
 * 6. Overall assertions
 *
 *    - Confirm happy-path success for platformAdmin (overview can be retrieved).
 *    - Confirm access control enforcement for memberUser (overview cannot be
 *         retrieved).
 */
export async function test_api_system_overview_access_control_for_platform_admin_only(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register", // valid URI
    referrer: "https://admin.console.example.com/", // valid URI
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one active platform setting as admin
  const settingCreateBody = {
    key: `karma.threshold.${RandomGenerator.alphabets(6)}`,
    value: "10", // as string; domain logic may interpret as integer threshold
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const createdSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingCreateBody,
      },
    );
  typia.assert(createdSetting);

  TestValidator.equals(
    "created setting key should match request key",
    createdSetting.key,
    settingCreateBody.key,
  );
  TestValidator.equals(
    "created setting value should match request value",
    createdSetting.value,
    settingCreateBody.value,
  );
  TestValidator.equals(
    "created setting description should match request description",
    createdSetting.description,
    settingCreateBody.description,
  );
  TestValidator.equals(
    "created setting should be active",
    createdSetting.is_active,
    true,
  );

  // 3. Fetch system overview as platform admin (happy path)
  const adminOverview: ICommunityPlatformSystemOverview =
    await api.functional.communityPlatform.platformAdmin.systemOverview.at(
      connection,
    );
  typia.assert(adminOverview);

  // Business sanity checks on overview structure
  TestValidator.predicate(
    "system overview voting section should be present",
    () => adminOverview.voting !== undefined && adminOverview.voting !== null,
  );
  TestValidator.predicate(
    "system overview karma section should be present",
    () => adminOverview.karma !== undefined && adminOverview.karma !== null,
  );
  TestValidator.predicate(
    "system overview safety section should be present",
    () => adminOverview.safety !== undefined && adminOverview.safety !== null,
  );
  TestValidator.predicate(
    "system overview statistics section should be present",
    () =>
      adminOverview.statistics !== undefined &&
      adminOverview.statistics !== null,
  );

  TestValidator.predicate(
    "active_settings_count in statistics should be non-negative",
    () => adminOverview.statistics.active_settings_count >= 0,
  );

  // 4. Join as member user (non-admin)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://app.example.com/join", // valid URI
    referrer: "https://app.example.com/landing", // valid URI
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Attempt to fetch system overview as member user and expect failure
  await TestValidator.error(
    "member user should not be able to access platformAdmin system overview",
    async () => {
      await api.functional.communityPlatform.platformAdmin.systemOverview.at(
        connection,
      );
    },
  );
}
