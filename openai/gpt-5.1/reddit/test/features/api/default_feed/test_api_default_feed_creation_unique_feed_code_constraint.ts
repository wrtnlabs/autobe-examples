import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate uniqueness constraint on default feed `feed_code` during creation.
 *
 * ## Business goal
 *
 * Platform administrators can register default feed configurations via `POST
 * /communityPlatform/platformAdmin/defaultFeeds`. The underlying Prisma model
 * enforces a unique index on `feed_code`, so the API must reject any attempt to
 * create a second configuration with the same `feed_code`.
 *
 * This test verifies that behavior end-to-end:
 *
 * - Authenticates a platform admin using `POST /auth/platformAdmin/join`.
 * - Creates an initial default feed with a specific `feed_code`.
 * - Attempts to create another default feed reusing the same `feed_code`.
 * - Expects the second attempt to fail with a business error while the first
 *   configuration remains valid.
 *
 * ## High-level steps
 *
 * 1. Join as a new platform admin via `api.functional.auth.platformAdmin.join`.
 *
 *    - Use realistic random values for username, email, password, and URLs.
 *    - Rely on the SDK to attach the JWT access token into the connection headers
 *         automatically.
 * 2. Build an `ICommunityPlatformDefaultFeed.ICreate` payload with a deterministic
 *    `feed_code` (e.g. "onboarding_global") and specific values for
 *    `feed_type`, `is_active`, and `is_platform_default`.
 * 3. Call `api.functional.communityPlatform.platformAdmin.defaultFeeds.create`
 *    with that payload.
 *
 *    - Assert the response with `typia.assert<ICommunityPlatformDefaultFeed>`.
 *    - Validate that the persisted configuration echoes back the requested business
 *         fields (feed_code, feed_type, flags) via `TestValidator.equals`.
 * 4. Prepare a second `ICommunityPlatformDefaultFeed.ICreate` payload using the
 *    _same_ `feed_code` but possibly different `feed_type` and flags to
 *    simulate a conflicting creation attempt.
 * 5. Call `api.functional.communityPlatform.platformAdmin.defaultFeeds.create`
 *    again and validate that it fails.
 *
 *    - Use `await TestValidator.error` with an async closure that performs the
 *         second create call.
 *    - Do not depend on specific HTTP status codes or error message content; it is
 *         sufficient that an error is thrown.
 * 6. (Optional sanity check) Since there is no GET-by-feed_code API in the
 *    provided SDK, we skip direct read-back verification and instead rely on
 *    the first response object as the source of truth that only one
 *    configuration exists for that `feed_code`.
 *
 * ## Technical notes
 *
 * - Use only the provided SDK functions:
 *
 *   - `api.functional.auth.platformAdmin.join`
 *   - `api.functional.communityPlatform.platformAdmin.defaultFeeds.create`
 * - Use `typia.assert` for response validation, and `TestValidator.equals` /
 *   `TestValidator.predicate` for business rule assertions.
 * - Avoid any direct manipulation of `connection.headers`; rely solely on the
 *   auth SDK to manage Authorization headers.
 * - Do not attempt to test type-level validation errors (e.g., wrong types or
 *   missing required fields); focus on runtime business constraint failure when
 *   reusing an existing `feed_code`.
 */
export async function test_api_default_feed_creation_unique_feed_code_constraint(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform admin.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare the first default feed creation payload with a fixed feed_code.
  const feedCode = "onboarding_global";

  const firstCreateBody = {
    feed_code: feedCode,
    feed_type: "onboarding",
    is_active: true,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  // 3. Create the first default feed configuration.
  const firstFeed: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert(firstFeed);

  // Basic business-field echo validation.
  TestValidator.equals(
    "first feed_code matches request",
    firstFeed.feed_code,
    firstCreateBody.feed_code,
  );
  TestValidator.equals(
    "first feed_type matches request",
    firstFeed.feed_type,
    firstCreateBody.feed_type,
  );
  TestValidator.equals(
    "first is_active flag matches request",
    firstFeed.is_active,
    firstCreateBody.is_active,
  );
  TestValidator.equals(
    "first is_platform_default flag matches request",
    firstFeed.is_platform_default,
    firstCreateBody.is_platform_default,
  );

  // 4. Prepare a second creation payload reusing the same feed_code
  //    but with different flags to simulate a conflict.
  const secondCreateBody = {
    feed_code: feedCode, // same code -> should violate uniqueness
    feed_type: "onboarding_variant",
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  // 5. Expect the second creation attempt to fail due to unique constraint
  //    on feed_code.
  await TestValidator.error(
    "duplicate feed_code must be rejected",
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );
}
