import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that retrieving a non-existent default feed configuration by
 * feedCode returns a not-found HTTP error for an authenticated platform admin.
 *
 * Business context:
 *
 * - Default feed configurations are managed by platform administrators and stored
 *   in `community_platform_default_feeds`, uniquely identified by `feed_code`.
 * - The GET /communityPlatform/platformAdmin/defaultFeeds/{feedCode} endpoint
 *   should only succeed when a configuration exists for the given feedCode and
 *   the caller is an authenticated platformAdmin actor.
 * - When the feedCode does not exist, the endpoint must respond with a not-found
 *   style error (HTTP 404) rather than returning an
 *   ICommunityPlatformDefaultFeed payload.
 *
 * Test steps:
 *
 * 1. Join as a new platform administrator via POST /auth/platformAdmin/join to
 *    obtain a valid authenticated admin context (token is set onto the
 *    connection by the SDK).
 * 2. Construct a clearly non-existent feedCode string with high entropy, and do
 *    not create any default feed configuration with this code.
 * 3. Invoke GET /communityPlatform/platformAdmin/defaultFeeds/{feedCode} using the
 *    authenticated connection and the non-existent feedCode.
 * 4. Assert that the call fails with an HttpError carrying a 404 status code using
 *    TestValidator.httpError, ensuring that no ICommunityPlatformDefaultFeed
 *    object is returned.
 * 5. Do not inspect or assert any error body structure beyond the HTTP status, as
 *    the success response type is ICommunityPlatformDefaultFeed and error
 *    payloads are not part of that contract.
 */
export async function test_api_default_feed_retrieval_not_found(
  connection: api.IConnection,
) {
  const joinBody = {
    username: RandomGenerator.alphaNumeric(16),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(24),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  const randomSuffix: string = RandomGenerator.alphaNumeric(24);
  const nonexistentFeedCode: string = `nonexistent_feed_${randomSuffix}`;

  await TestValidator.httpError(
    "getting non-existent default feed should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.at(
        connection,
        {
          feedCode: nonexistentFeedCode,
        },
      );
    },
  );
}
