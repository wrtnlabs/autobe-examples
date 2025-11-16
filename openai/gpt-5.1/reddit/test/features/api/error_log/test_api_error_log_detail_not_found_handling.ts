import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify not-found handling for error log detail retrieval with platform admin
 * authentication.
 *
 * Business goal: Ensure that when a platform administrator requests details for
 * an error log ID that does not exist in `community_platform_error_logs`, the
 * backend does not return a successful `ICommunityPlatformErrorLog` object but
 * instead fails the request with an HTTP-level error. This test also implicitly
 * verifies that platform admin authentication is required and functioning,
 * because the request is made with a valid platformAdmin access token obtained
 * via the join endpoint.
 *
 * Test flow:
 *
 * 1. Register and authenticate a new platform admin account using
 *    `api.functional.auth.platformAdmin.join`, providing a realistic join
 *    payload that satisfies `ICommunityPlatformPlatformadmin.IJoin`.
 * 2. Generate a random UUID value for `errorLogId` using `typia.random<string &
 *    tags.Format<"uuid">>()`. We assume this ID is extremely unlikely to match
 *    any real `community_platform_error_logs.id` for the current test
 *    database.
 * 3. Invoke `api.functional.communityPlatform.platformAdmin.errorLogs.at` with the
 *    authenticated connection and the random `errorLogId`.
 * 4. Use `TestValidator.error` to assert that the call fails with an error,
 *    instead of returning an `ICommunityPlatformErrorLog` object. Per
 *    constraints, we do not inspect or assert the status code or error body; we
 *    only assert that an error occurs.
 *
 * Notes:
 *
 * - We must not touch `connection.headers` directly; authentication is handled
 *   automatically by the SDK in the join call.
 * - We must not assert specific HTTP status codes or response body structure.
 *   Only presence of an error is validated.
 * - We must not deliberately send invalid types; the random UUID must satisfy the
 *   tagged type `string & tags.Format<"uuid">`.
 */
export async function test_api_error_log_detail_not_found_handling(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Generate a UUID that is extremely unlikely to exist as an error log ID
  const nonexistentErrorLogId = typia.random<string & tags.Format<"uuid">>();

  // 3-4. Call detail endpoint and assert that an HTTP error occurs
  await TestValidator.error("nonexistent error log should fail", async () => {
    await api.functional.communityPlatform.platformAdmin.errorLogs.at(
      connection,
      {
        errorLogId: nonexistentErrorLogId,
      },
    );
  });
}
