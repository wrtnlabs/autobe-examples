import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Basic happy-path creation of a default feed configuration by a platform
 * admin.
 *
 * Business flow:
 *
 * 1. A new platform admin completes the join/registration flow via POST
 *    /auth/platformAdmin/join, which both creates the admin row and issues JWT
 *    tokens. The SDK automatically attaches the access token to the connection
 *    headers, so subsequent calls execute as the platformAdmin actor.
 * 2. Using this authenticated context, the admin calls POST
 *    /communityPlatform/platformAdmin/defaultFeeds
 *    (api.functional.communityPlatform.platformAdmin.defaultFeeds.create) with
 *    an ICommunityPlatformDefaultFeed.ICreate payload containing:
 *
 *    - Feed_code: a unique, non-empty code
 *    - Feed_type: a meaningful category key like "home" or "onboarding"
 *    - Is_active: true, to immediately enable the configuration
 *    - Is_platform_default: false, to represent a non-primary default feed.
 * 3. The backend persists a new row into community_platform_default_feeds and
 *    returns the full ICommunityPlatformDefaultFeed record including id and
 *    audit timestamps.
 * 4. The test asserts:
 *
 *    - Response structurally matches ICommunityPlatformDefaultFeed using
 *         typia.assert
 *    - Id is a non-empty UUID string (already guaranteed by typia.assert, but we
 *         also check it’s not an empty string via business-level assertion)
 *    - Feed_code, feed_type, is_active, is_platform_default equal the requested
 *         input values
 *    - Created_at and updated_at are non-empty strings (ISO date-times are
 *         structurally validated by typia.assert).
 *
 * Constraints and notes:
 *
 * - Do not test HTTP status codes explicitly.
 * - Do not perform any negative/type-error tests.
 * - Rely on the SDK’s automatic Authorization header handling from the join call;
 *   do not manipulate connection.headers directly.
 * - We do not call any GET-by-feedCode endpoint because the SDK for it was not
 *   provided; instead we rely on the create response object for verification.
 */
export async function test_api_default_feed_creation_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (happy-path join)
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. As authenticated platformAdmin, create a default feed configuration
  const feedCode = `home_default_${RandomGenerator.alphaNumeric(8)}`;
  const feedType = "home";

  const createBody = {
    feed_code: feedCode,
    feed_type: feedType,
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const created =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformDefaultFeed>(created);

  // 3. Business-level validations comparing input vs. output
  TestValidator.equals(
    "created default feed code should match input feed_code",
    created.feed_code,
    feedCode,
  );

  TestValidator.equals(
    "created default feed type should match input feed_type",
    created.feed_type,
    feedType,
  );

  TestValidator.equals(
    "created default feed is_active should match input is_active",
    created.is_active,
    true,
  );

  TestValidator.equals(
    "created default feed is_platform_default should match input flag",
    created.is_platform_default,
    false,
  );

  // 4. Basic invariants on id and timestamps (beyond type-level validation)
  TestValidator.predicate(
    "created default feed id should be a non-empty string",
    created.id.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty ISO date-time string",
    created.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty ISO date-time string",
    created.updated_at.length > 0,
  );
}
