import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can change the `feed_type` of an
 * existing default feed configuration while keeping its `id` and `feed_code`
 * stable and preserving unspecified flags.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a platform admin via POST /auth/platformAdmin/join.
 * 2. Create a default feed configuration via POST
 *    /communityPlatform/platformAdmin/defaultFeeds with a known `feed_code`,
 *    `feed_type`, `is_active`, and `is_platform_default`.
 * 3. Update that configuration via PUT
 *    /communityPlatform/platformAdmin/defaultFeeds/{feedCode} with an
 *    ICommunityPlatformDefaultFeed.IUpdate body that only changes `feed_type`.
 * 4. Assert that:
 *
 *    - `id` and `feed_code` remain unchanged.
 *    - `feed_type` changes to the new value.
 *    - `is_active` and `is_platform_default` remain as before (partial update
 *         semantics).
 *    - `updated_at` is later than the initial `updated_at` value.
 */
export async function test_api_default_feed_update_change_feed_type(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin via join.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/login",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a default feed configuration with a known feed_code and feed_type.
  const initialFeedCode = `default-feed-${RandomGenerator.alphaNumeric(8)}`;
  const initialFeedType = "popular";
  const createBody = {
    feed_code: initialFeedCode,
    feed_type: initialFeedType,
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const created: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // Basic sanity checks on created configuration.
  TestValidator.equals(
    "created feed_code should match request",
    created.feed_code,
    initialFeedCode,
  );
  TestValidator.equals(
    "created feed_type should match request",
    created.feed_type,
    initialFeedType,
  );
  TestValidator.equals(
    "created is_active matches request",
    created.is_active,
    createBody.is_active,
  );
  TestValidator.equals(
    "created is_platform_default matches request",
    created.is_platform_default,
    createBody.is_platform_default,
  );

  const originalId = created.id;
  const originalFeedCode = created.feed_code;
  const originalFeedType = created.feed_type;
  const originalIsActive = created.is_active;
  const originalIsPlatformDefault = created.is_platform_default;
  const originalUpdatedAt = created.updated_at;

  // 3. Update feed_type only using PUT /communityPlatform/platformAdmin/defaultFeeds/{feedCode}.
  const updatedFeedType = "recommended";
  const updateBody = {
    feed_type: updatedFeedType,
  } satisfies ICommunityPlatformDefaultFeed.IUpdate;

  const updated: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
      connection,
      {
        feedCode: originalFeedCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Business rule assertions.
  // id remains stable
  TestValidator.equals(
    "id should remain unchanged after update",
    updated.id,
    originalId,
  );

  // feed_code remains stable
  TestValidator.equals(
    "feed_code should remain unchanged after update",
    updated.feed_code,
    originalFeedCode,
  );

  // feed_type should have changed
  TestValidator.equals(
    "feed_type should be updated to new value",
    updated.feed_type,
    updatedFeedType,
  );
  TestValidator.notEquals(
    "feed_type should differ from original value",
    updated.feed_type,
    originalFeedType,
  );

  // Unspecified flags should remain unchanged
  TestValidator.equals(
    "is_active should remain unchanged when omitted in update",
    updated.is_active,
    originalIsActive,
  );
  TestValidator.equals(
    "is_platform_default should remain unchanged when omitted in update",
    updated.is_platform_default,
    originalIsPlatformDefault,
  );

  // updated_at should be later than or equal to original updated_at
  const originalUpdatedAtDate = new Date(originalUpdatedAt).getTime();
  const updatedUpdatedAtDate = new Date(updated.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be later than or equal to original updated_at",
    updatedUpdatedAtDate >= originalUpdatedAtDate,
  );
}
