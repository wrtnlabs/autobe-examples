import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_default_feed_update_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection clone with empty headers
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 2. Build a syntactically valid update body (all fields optional)
  const unauthorizedUpdateBody = {
    feed_type: "unauthorized-type",
    is_active: false,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.IUpdate;

  // 3. Verify that calling update without admin auth fails
  await TestValidator.error(
    "default feed update requires admin authentication",
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
        unauthenticated,
        {
          feedCode: "non-existent-feed-code",
          body: unauthorizedUpdateBody,
        },
      );
    },
  );

  // 4. Join as a new platform admin on the main connection
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 5. Create a default feed configuration as this admin
  const createBody = {
    feed_code: RandomGenerator.alphaNumeric(12),
    feed_type: "initial-type",
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const created =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformDefaultFeed>(created);

  // 6. Prepare an authenticated update body that changes mutable flags
  const updateBody = {
    feed_type: "updated-type",
    is_active: false,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.IUpdate;

  const updated =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.update(
      connection,
      {
        feedCode: created.feed_code,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformDefaultFeed>(updated);

  // 7. Validate immutable fields remain stable
  TestValidator.equals(
    "id should remain unchanged after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "feed_code should remain unchanged after update",
    updated.feed_code,
    created.feed_code,
  );
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    created.created_at,
  );

  // 8. Validate mutable fields reflect the update request
  TestValidator.equals(
    "feed_type should be updated",
    updated.feed_type,
    updateBody.feed_type,
  );
  TestValidator.equals(
    "is_active should be updated",
    updated.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "is_platform_default should be updated",
    updated.is_platform_default,
    updateBody.is_platform_default,
  );

  // 9. Ensure that updated_at reflects a modification (string inequality)
  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    created.updated_at,
  );
}
