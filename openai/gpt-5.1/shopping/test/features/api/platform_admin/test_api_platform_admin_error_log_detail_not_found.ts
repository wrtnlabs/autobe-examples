import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallErrorLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate not-found behavior of platform admin error log detail endpoint.
 *
 * Business context: Platform administrators can inspect detailed application
 * error logs via GET /shoppingMall/platformAdmin/errorLogs/{errorLogId}. When a
 * platform admin requests an error log ID that does not exist in
 * shopping_mall_error_logs, the backend must respond with a clear not-found
 * error rather than returning an empty or partial IShoppingMallErrorLog.
 *
 * This test ensures that an authenticated platform admin receives an error
 * (e.g., 404) when requesting a random, non-existent errorLogId and that the
 * SDK surfaces this as a failing call. We do not assert the specific HTTP
 * status code or error payload structure; we only validate that the call does
 * not succeed and that no IShoppingMallErrorLog is returned for a non-existent
 * ID.
 *
 * Steps:
 *
 * 1. Register a platform admin with POST /auth/platformAdmin/join using
 *    IShoppingMallPlatformAdminJoin.IRequest. This returns
 *    IShoppingMallPlatformAdmin.IAuthorized and automatically configures
 *    connection.headers.Authorization with the access token.
 * 2. Generate a random UUID for errorLogId using typia.random<string &
 *    tags.Format<"uuid">>(). This UUID should almost certainly not match any
 *    real shopping_mall_error_logs.id in the test database.
 * 3. Invoke api.functional.shoppingMall.platformAdmin.errorLogs.at with the random
 *    errorLogId.
 * 4. Wrap the call in TestValidator.error to assert that it fails, meaning the
 *    backend responded with an error instead of an IShoppingMallErrorLog.
 * 5. Do not attempt to inspect the HttpError status code or message, and do not
 *    perform any additional validation on error payloads; the goal is solely to
 *    guarantee that not-found produces an error rather than a successful
 *    response.
 */
export async function test_api_platform_admin_error_log_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authenticated context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Generate a random UUID that should not correspond to any existing error log.
  const nonExistentErrorLogId = typia.random<string & tags.Format<"uuid">>();

  // 3-4. Attempt to retrieve the non-existent error log and assert that the
  // call fails (e.g., not-found). We do not care about exact status code.
  await TestValidator.error(
    "non-existent error log must produce error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.errorLogs.at(connection, {
        errorLogId: nonExistentErrorLogId,
      });
    },
  );
}
