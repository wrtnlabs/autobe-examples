import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_error_log_detail_requires_platform_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare a candidate errorLogId.
  // In real E2E, this should match a seeded record. Here we rely on
  // typia.random to generate a UUID format string. Even if the backend
  // returns 404 for non-existing IDs, our primary concern in this test
  // is authentication behavior, validated via 401 in the first step
  // and successful access after authentication.
  const errorLogId = typia.random<string & tags.Format<"uuid">>();

  // 2. Unauthenticated access should fail with 401 Unauthorized.
  await TestValidator.httpError(
    "unauthenticated error log detail request must be rejected with 401",
    401,
    async () => {
      await api.functional.communityPlatform.platformAdmin.errorLogs.at(
        connection,
        {
          errorLogId,
        },
      );
    },
  );

  // 3. Join as a new platform administrator to obtain authentication.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // ip is optional; omit it to keep the payload minimal and valid.
    href: "https://admin.example.com/register", // valid URI
    referrer: "https://example.com/landing", // valid URI
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  // Type-level and runtime validation of the auth payload.
  typia.assert(authorized);

  // 4. Authenticated access should now succeed and return a full error log.
  const errorLog: ICommunityPlatformErrorLog =
    await api.functional.communityPlatform.platformAdmin.errorLogs.at(
      connection,
      {
        errorLogId,
      },
    );
  typia.assert(errorLog);

  // 5. Validate that the returned log corresponds to the requested id.
  TestValidator.equals(
    "authenticated request must return error log with matching id",
    errorLog.id,
    errorLogId,
  );
}
