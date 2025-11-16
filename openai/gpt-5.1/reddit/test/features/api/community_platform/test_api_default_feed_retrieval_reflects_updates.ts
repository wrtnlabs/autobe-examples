import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that default feed retrieval reflects the latest updates.
 *
 * Business goal
 *
 * - Ensure GET /communityPlatform/platformAdmin/defaultFeeds/{feedCode} always
 *   returns the most recently persisted state of a default feed configuration
 *   after an authenticated platform admin updates it.
 *
 * High-level flow
 *
 * 1. Register and authenticate a platform admin with join API.
 * 2. Create a default feed configuration with a fixed feed_code.
 * 3. Update mutable fields of that configuration via its feedCode.
 * 4. Retrieve the configuration by the same feedCode.
 * 5. Assert that the retrieved entity reflects the update and not stale data.
 */
export async function test_api_default_feed_retrieval_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://landing.example.com/default-feeds",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial default feed configuration
  const feedCode = "popular_feed";
  const createBody = {
    feed_code: feedCode,
    feed_type: "popular",
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const createdFeed: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdFeed);

  // 3. Update mutable fields of the configuration
  const updatedFeedType = "onboarding";
  const updatedIsActive = false;
  const updatedIsPlatformDefault = true;

  const updateBody = {
    feed_type: updatedFeedType,
    is_active: updatedIsActive,
    is_platform_default: updatedIsPlatformDefault,
  } satisfies ICommunityPlatformDefaultFeed.IUpdate;

  const updatedFeed: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
      connection,
      {
        feedCode,
        body: updateBody,
      },
    );
  typia.assert(updatedFeed);

  // 4. Retrieve the configuration by feedCode
  const reloadedFeed: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.at(
      connection,
      { feedCode },
    );
  typia.assert(reloadedFeed);

  // 5. Business assertions

  // 5-1. Identity stability: id and feed_code must not change
  TestValidator.equals(
    "created and updated feeds share the same id",
    updatedFeed.id,
    createdFeed.id,
  );
  TestValidator.equals(
    "reloaded feed id matches created id",
    reloadedFeed.id,
    createdFeed.id,
  );

  TestValidator.equals(
    "created feed_code equals requested feedCode",
    createdFeed.feed_code,
    feedCode,
  );
  TestValidator.equals(
    "reloaded feed_code equals requested feedCode",
    reloadedFeed.feed_code,
    feedCode,
  );

  // 5-2. Business fields reflect the update
  TestValidator.equals(
    "reloaded feed_type reflects updated value",
    reloadedFeed.feed_type,
    updatedFeedType,
  );
  TestValidator.equals(
    "reloaded is_active reflects updated value",
    reloadedFeed.is_active,
    updatedIsActive,
  );
  TestValidator.equals(
    "reloaded is_platform_default reflects updated value",
    reloadedFeed.is_platform_default,
    updatedIsPlatformDefault,
  );

  // 5-3. created_at is stable; updated_at has advanced
  TestValidator.equals(
    "created_at remains unchanged after update",
    reloadedFeed.created_at,
    createdFeed.created_at,
  );

  TestValidator.notEquals(
    "updated_at is changed after update",
    updatedFeed.updated_at,
    createdFeed.updated_at,
  );

  TestValidator.equals(
    "reloaded updated_at matches updatedFeed updated_at",
    reloadedFeed.updated_at,
    updatedFeed.updated_at,
  );

  // 5-4. Ensure reloadedFeed and updatedFeed are deeply equal
  TestValidator.equals(
    "reloaded feed equals updated feed snapshot",
    reloadedFeed,
    updatedFeed,
  );
}
