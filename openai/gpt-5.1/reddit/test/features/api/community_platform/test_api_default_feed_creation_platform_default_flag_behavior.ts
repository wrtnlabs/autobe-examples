import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation and persistence of platform-default vs non-default
 * community platform feed configurations.
 *
 * Business intent:
 *
 * - A platform administrator can define multiple default feed configurations.
 * - Some of these may be marked as the primary platform default
 *   (is_platform_default = true), while others are experimental or secondary
 *   (is_platform_default = false).
 * - Both should be persisted independently and retrievable by feed_code, with
 *   their flags intact so downstream components can distinguish them.
 *
 * Steps covered by this test:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join to establish an
 *    authenticated platformAdmin session.
 * 2. Using that session, create a first default feed configuration with
 *    is_platform_default = true and is_active = true.
 * 3. Create a second default feed configuration with a different feed_code,
 *    is_platform_default = false, and is_active = true.
 * 4. Retrieve each configuration individually with GET
 *    /communityPlatform/platformAdmin/defaultFeeds/{feedCode} and verify that:
 *
 *    - Feed_code and feed_type match what was sent on creation
 *    - Is_active is true for both records
 *    - Is_platform_default is true for the first, false for the second
 *    - Created_at and updated_at are stable between creation and read.
 * 5. Assert that the two records coexist without conflicting feed_code values and
 *    that their roles (platform default vs non-default) are distinguishable
 *    purely by the is_platform_default flag.
 */
export async function test_api_default_feed_creation_platform_default_flag_behavior(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain an authenticated session.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://landing.example.com",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a platform-default feed configuration (is_platform_default = true).
  const platformDefaultFeedCode = `platform_default_main_${RandomGenerator.alphaNumeric(6)}`;
  const platformDefaultCreateBody = {
    feed_code: platformDefaultFeedCode,
    feed_type: "popular",
    is_active: true,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const platformDefaultCreated: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      {
        body: platformDefaultCreateBody,
      },
    );
  typia.assert(platformDefaultCreated);

  // Basic invariants and flag checks for the platform-default record.
  TestValidator.equals(
    "platform default feed_code should match input",
    platformDefaultCreated.feed_code,
    platformDefaultCreateBody.feed_code,
  );
  TestValidator.equals(
    "platform default feed_type should match input",
    platformDefaultCreated.feed_type,
    platformDefaultCreateBody.feed_type,
  );
  TestValidator.equals(
    "platform default is_active should be true",
    platformDefaultCreated.is_active,
    platformDefaultCreateBody.is_active,
  );
  TestValidator.equals(
    "platform default is_platform_default should be true",
    platformDefaultCreated.is_platform_default,
    platformDefaultCreateBody.is_platform_default,
  );
  TestValidator.predicate(
    "platform default id must be a non-empty string",
    platformDefaultCreated.id.length > 0,
  );

  // 3. Create a non-platform-default (experimental) feed configuration.
  const nonDefaultFeedCode = `non_default_experiment_${RandomGenerator.alphaNumeric(6)}`;
  const nonDefaultCreateBody = {
    feed_code: nonDefaultFeedCode,
    feed_type: "popular_experiment",
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const nonDefaultCreated: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      {
        body: nonDefaultCreateBody,
      },
    );
  typia.assert(nonDefaultCreated);

  TestValidator.equals(
    "non-default feed_code should match input",
    nonDefaultCreated.feed_code,
    nonDefaultCreateBody.feed_code,
  );
  TestValidator.equals(
    "non-default feed_type should match input",
    nonDefaultCreated.feed_type,
    nonDefaultCreateBody.feed_type,
  );
  TestValidator.equals(
    "non-default is_active should be true",
    nonDefaultCreated.is_active,
    nonDefaultCreateBody.is_active,
  );
  TestValidator.equals(
    "non-default is_platform_default should be false",
    nonDefaultCreated.is_platform_default,
    nonDefaultCreateBody.is_platform_default,
  );
  TestValidator.predicate(
    "non-default id must be a non-empty string",
    nonDefaultCreated.id.length > 0,
  );

  // Ensure feed_code uniqueness and distinct roles.
  TestValidator.notEquals(
    "platform-default and non-default feed_codes must differ",
    platformDefaultCreated.feed_code,
    nonDefaultCreated.feed_code,
  );
  TestValidator.notEquals(
    "platform-default and non-default ids must differ",
    platformDefaultCreated.id,
    nonDefaultCreated.id,
  );
  TestValidator.predicate(
    "platform default should have is_platform_default=true while non-default has false",
    platformDefaultCreated.is_platform_default === true &&
      nonDefaultCreated.is_platform_default === false,
  );

  // 4. Read back each configuration by feed_code and verify persistence.
  const platformDefaultFetched: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.at(
      connection,
      {
        feedCode: platformDefaultFeedCode,
      },
    );
  typia.assert(platformDefaultFetched);

  TestValidator.equals(
    "fetched platform-default feed_code should equal created",
    platformDefaultFetched.feed_code,
    platformDefaultCreated.feed_code,
  );
  TestValidator.equals(
    "fetched platform-default feed_type should equal created",
    platformDefaultFetched.feed_type,
    platformDefaultCreated.feed_type,
  );
  TestValidator.equals(
    "fetched platform-default is_active should equal created",
    platformDefaultFetched.is_active,
    platformDefaultCreated.is_active,
  );
  TestValidator.equals(
    "fetched platform-default is_platform_default should remain true",
    platformDefaultFetched.is_platform_default,
    platformDefaultCreated.is_platform_default,
  );
  TestValidator.equals(
    "fetched platform-default created_at should equal created created_at",
    platformDefaultFetched.created_at,
    platformDefaultCreated.created_at,
  );
  TestValidator.equals(
    "fetched platform-default updated_at should equal created updated_at",
    platformDefaultFetched.updated_at,
    platformDefaultCreated.updated_at,
  );

  const nonDefaultFetched: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.at(
      connection,
      {
        feedCode: nonDefaultFeedCode,
      },
    );
  typia.assert(nonDefaultFetched);

  TestValidator.equals(
    "fetched non-default feed_code should equal created",
    nonDefaultFetched.feed_code,
    nonDefaultCreated.feed_code,
  );
  TestValidator.equals(
    "fetched non-default feed_type should equal created",
    nonDefaultFetched.feed_type,
    nonDefaultCreated.feed_type,
  );
  TestValidator.equals(
    "fetched non-default is_active should equal created",
    nonDefaultFetched.is_active,
    nonDefaultCreated.is_active,
  );
  TestValidator.equals(
    "fetched non-default is_platform_default should remain false",
    nonDefaultFetched.is_platform_default,
    nonDefaultCreated.is_platform_default,
  );
  TestValidator.equals(
    "fetched non-default created_at should equal created created_at",
    nonDefaultFetched.created_at,
    nonDefaultCreated.created_at,
  );
  TestValidator.equals(
    "fetched non-default updated_at should equal created updated_at",
    nonDefaultFetched.updated_at,
    nonDefaultCreated.updated_at,
  );

  // 5. Final coexistence and role distinction assertions on fetched records.
  TestValidator.notEquals(
    "fetched records should have distinct ids",
    platformDefaultFetched.id,
    nonDefaultFetched.id,
  );
  TestValidator.notEquals(
    "fetched records should have distinct feed_codes",
    platformDefaultFetched.feed_code,
    nonDefaultFetched.feed_code,
  );
  TestValidator.predicate(
    "fetched records should be distinguishable by is_platform_default flag",
    platformDefaultFetched.is_platform_default === true &&
      nonDefaultFetched.is_platform_default === false,
  );
}
