import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate toggling of activation-related flags on default feed configurations.
 *
 * Business purpose: Platform administrators must be able to control whether a
 * given default feed configuration is active and whether it is considered a
 * platform-level default, without recreating the configuration row. This test
 * ensures that the update endpoint correctly flips `is_active` and
 * `is_platform_default`, preserves immutable identity fields, and updates
 * timestamps appropriately, while also supporting partial updates.
 *
 * Steps:
 *
 * 1. Register a platform administrator using the join endpoint so that subsequent
 *    communityPlatform platformAdmin operations are authenticated.
 * 2. Create a default feed configuration with `is_active=true` and
 *    `is_platform_default=false`.
 * 3. Toggle flags via update so that `is_active=false` and
 *    `is_platform_default=true`.
 * 4. Toggle again to revert: `is_active=true`, `is_platform_default=false`.
 * 5. Perform a partial update with only `is_active=false` to verify that
 *    unspecified fields are preserved.
 * 6. Throughout, verify that `id` and `feed_code` remain unchanged while
 *    `updated_at` changes on each update.
 */
export async function test_api_default_feed_update_toggle_activation_flags(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (auth context)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create initial default feed configuration
  const createBody = {
    feed_code: RandomGenerator.alphaNumeric(16),
    feed_type: "onboarding",
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
  typia.assert<ICommunityPlatformDefaultFeed>(createdFeed);

  // 3. First toggle: deactivate as general default but mark as platform default
  const firstUpdateBody = {
    is_active: false,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.IUpdate;

  const updatedFeed1: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
      connection,
      {
        feedCode: createdFeed.feed_code,
        body: firstUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformDefaultFeed>(updatedFeed1);

  // Validate identity stability and flag changes
  TestValidator.equals(
    "id remains stable after first toggle",
    updatedFeed1.id,
    createdFeed.id,
  );
  TestValidator.equals(
    "feed_code remains stable after first toggle",
    updatedFeed1.feed_code,
    createdFeed.feed_code,
  );
  TestValidator.equals(
    "is_active is false after first toggle",
    updatedFeed1.is_active,
    false,
  );
  TestValidator.equals(
    "is_platform_default is true after first toggle",
    updatedFeed1.is_platform_default,
    true,
  );
  TestValidator.notEquals(
    "updated_at changes on first toggle",
    updatedFeed1.updated_at,
    createdFeed.updated_at,
  );

  // 4. Second toggle: revert flags
  const secondUpdateBody = {
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.IUpdate;

  const updatedFeed2: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
      connection,
      {
        feedCode: createdFeed.feed_code,
        body: secondUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformDefaultFeed>(updatedFeed2);

  TestValidator.equals(
    "id remains stable after second toggle",
    updatedFeed2.id,
    createdFeed.id,
  );
  TestValidator.equals(
    "feed_code remains stable after second toggle",
    updatedFeed2.feed_code,
    createdFeed.feed_code,
  );
  TestValidator.equals(
    "is_active is true after second toggle",
    updatedFeed2.is_active,
    true,
  );
  TestValidator.equals(
    "is_platform_default is false after second toggle",
    updatedFeed2.is_platform_default,
    false,
  );
  TestValidator.notEquals(
    "updated_at changes on second toggle",
    updatedFeed2.updated_at,
    updatedFeed1.updated_at,
  );

  // 5. Partial update: only change is_active, keep platform default flag
  const partialUpdateBody = {
    is_active: false,
  } satisfies ICommunityPlatformDefaultFeed.IUpdate;

  const updatedFeed3: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
      connection,
      {
        feedCode: createdFeed.feed_code,
        body: partialUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformDefaultFeed>(updatedFeed3);

  TestValidator.equals(
    "id remains stable after partial update",
    updatedFeed3.id,
    createdFeed.id,
  );
  TestValidator.equals(
    "feed_code remains stable after partial update",
    updatedFeed3.feed_code,
    createdFeed.feed_code,
  );
  TestValidator.equals(
    "is_active is false after partial update",
    updatedFeed3.is_active,
    false,
  );
  TestValidator.equals(
    "is_platform_default preserved on partial update",
    updatedFeed3.is_platform_default,
    updatedFeed2.is_platform_default,
  );
  TestValidator.notEquals(
    "updated_at changes on partial update",
    updatedFeed3.updated_at,
    updatedFeed2.updated_at,
  );
}
