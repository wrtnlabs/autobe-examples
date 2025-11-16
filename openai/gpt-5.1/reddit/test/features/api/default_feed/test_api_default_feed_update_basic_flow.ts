import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can create and then update a default
 * feed configuration, and that repeated updates with the same payload behave
 * idempotently.
 *
 * Business flow:
 *
 * 1. Register a new platform admin via /auth/platformAdmin/join.
 * 2. As that admin, create a default feed via
 *    /communityPlatform/platformAdmin/defaultFeeds.
 * 3. Update the created default feed via
 *    /communityPlatform/platformAdmin/defaultFeeds/{feedCode}.
 * 4. Verify immutable fields (id, feed_code, created_at) are preserved and mutable
 *    fields change as expected.
 * 5. Call the same update again to verify idempotent behavior and stable business
 *    state.
 */
export async function test_api_default_feed_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial default feed configuration.
  const createBody = {
    feed_code: `onboarding_${RandomGenerator.alphaNumeric(6)}`,
    feed_type: "onboarding",
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const created: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Capture original immutable and mutable fields.
  const originalId = created.id;
  const originalFeedCode = created.feed_code;
  const originalFeedType = created.feed_type;
  const originalIsActive = created.is_active;
  const originalIsPlatformDefault = created.is_platform_default;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Prepare an update payload that toggles some mutable fields.
  const updatedFeedType =
    originalFeedType === "onboarding" ? "recommended" : "onboarding";
  const updateBody = {
    feed_type: updatedFeedType,
    is_active: !originalIsActive,
    is_platform_default: !originalIsPlatformDefault,
  } satisfies ICommunityPlatformDefaultFeed.IUpdate;

  const firstUpdated: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
      connection,
      {
        feedCode: originalFeedCode,
        body: updateBody,
      },
    );
  typia.assert(firstUpdated);

  // 4. Validate immutable and mutable field behavior after first update.
  TestValidator.equals(
    "id must remain unchanged after update",
    firstUpdated.id,
    originalId,
  );
  TestValidator.equals(
    "feed_code must remain unchanged after update",
    firstUpdated.feed_code,
    originalFeedCode,
  );
  TestValidator.equals(
    "created_at must remain unchanged after update",
    firstUpdated.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "feed_type should reflect updated value",
    firstUpdated.feed_type,
    updatedFeedType,
  );
  TestValidator.equals(
    "is_active should be toggled",
    firstUpdated.is_active,
    !originalIsActive,
  );
  TestValidator.equals(
    "is_platform_default should be toggled",
    firstUpdated.is_platform_default,
    !originalIsPlatformDefault,
  );

  const originalUpdatedAtDate = new Date(originalUpdatedAt);
  const firstUpdatedAtDate = new Date(firstUpdated.updated_at);
  TestValidator.predicate(
    "updated_at should be greater than or equal to original updated_at",
    firstUpdatedAtDate.getTime() >= originalUpdatedAtDate.getTime(),
  );
  TestValidator.predicate(
    "created_at should not be after updated_at",
    firstUpdatedAtDate.getTime() >= new Date(originalCreatedAt).getTime(),
  );

  // 5. Call update again with the same payload to validate idempotent behavior.
  const secondUpdated: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
      connection,
      {
        feedCode: originalFeedCode,
        body: updateBody,
      },
    );
  typia.assert(secondUpdated);

  // Immutable fields must still be preserved.
  TestValidator.equals(
    "id must remain unchanged after second update",
    secondUpdated.id,
    originalId,
  );
  TestValidator.equals(
    "feed_code must remain unchanged after second update",
    secondUpdated.feed_code,
    originalFeedCode,
  );
  TestValidator.equals(
    "created_at must remain unchanged after second update",
    secondUpdated.created_at,
    originalCreatedAt,
  );

  // Mutable fields should match the values from the first update.
  TestValidator.equals(
    "feed_type should remain as in first update",
    secondUpdated.feed_type,
    firstUpdated.feed_type,
  );
  TestValidator.equals(
    "is_active should remain as in first update",
    secondUpdated.is_active,
    firstUpdated.is_active,
  );
  TestValidator.equals(
    "is_platform_default should remain as in first update",
    secondUpdated.is_platform_default,
    firstUpdated.is_platform_default,
  );

  const secondUpdatedAtDate = new Date(secondUpdated.updated_at);
  TestValidator.predicate(
    "second updated_at should be greater than or equal to first updated_at",
    secondUpdatedAtDate.getTime() >= firstUpdatedAtDate.getTime(),
  );
}
