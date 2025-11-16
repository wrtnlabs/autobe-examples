import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate retrieval of a default feed configuration by feed_code after
 * creation.
 *
 * Business context: Platform administrators manage system-wide "default" feeds
 * that are used for onboarding or fallback experiences. Each configuration is
 * uniquely identified by a business-level `feed_code`. Admin tools must be able
 * to create a configuration and then reliably fetch it back by this code,
 * seeing consistent flags and timestamps.
 *
 * Test flow:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join to obtain
 *    an authenticated platformAdmin context (token handled by SDK).
 * 2. As that admin, create a new default feed configuration using POST
 *    /communityPlatform/platformAdmin/defaultFeeds with a unique `feed_code`,
 *    some `feed_type`, and boolean flags `is_active` and
 *    `is_platform_default`.
 * 3. Validate the creation response against ICommunityPlatformDefaultFeed, and
 *    ensure the business fields echo the request while system fields (`id`,
 *    `created_at`, `updated_at`) are non-empty and well-formed.
 * 4. Call GET /communityPlatform/platformAdmin/defaultFeeds/{feedCode} with the
 *    same `feed_code` value.
 * 5. Assert that the retrieved configuration is deeply equal to the created one
 *    (no drift in flags or timestamps) and that there are no unexpected
 *    properties beyond the ICommunityPlatformDefaultFeed schema (typia.assert
 *    already enforces this).
 */
export async function test_api_default_feed_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join) to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd-" + RandomGenerator.alphabets(6),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a default feed configuration with a unique feed_code
  const feedCode: string = `onboarding_${RandomGenerator.alphaNumeric(10)}`;

  const createBody = {
    feed_code: feedCode,
    feed_type: "onboarding",
    is_active: true,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const created: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Business field equality between request and response
  TestValidator.equals(
    "created feed_code should match request",
    created.feed_code,
    createBody.feed_code,
  );
  TestValidator.equals(
    "created feed_type should match request",
    created.feed_type,
    createBody.feed_type,
  );
  TestValidator.equals(
    "created is_active should match request",
    created.is_active,
    createBody.is_active,
  );
  TestValidator.equals(
    "created is_platform_default should match request",
    created.is_platform_default,
    createBody.is_platform_default,
  );

  // System-managed fields non-empty and well-formed (typia.assert already checks format)
  TestValidator.predicate(
    "created id should be a non-empty string",
    created.id.length > 0,
  );
  TestValidator.predicate(
    "created_at should be a non-empty string",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    created.updated_at.length > 0,
  );

  // 3. Retrieve the configuration by feedCode
  const fetched: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.at(
      connection,
      {
        feedCode: created.feed_code,
      },
    );
  typia.assert(fetched);

  // 4. Assert deep equality between created and fetched configurations
  TestValidator.equals(
    "fetched default feed must equal created default feed",
    fetched,
    created,
  );
}
