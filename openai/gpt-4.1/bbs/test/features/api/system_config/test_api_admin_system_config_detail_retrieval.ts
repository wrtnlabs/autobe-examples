import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";

/**
 * Validate system config detail retrieval for single configKey by admin.
 *
 * Validates that:
 *
 * - Unauthenticated access is denied
 * - Fetching a non-existent configKey fails with error
 *
 * Limitations:
 *
 * - There is no API available to create configs in this test, so we cannot test
 *   positive detail fetches for existing items or soft-deleted configs here. We
 *   only test error responses for forbidden and not-found cases using the
 *   available SDK.
 */
export async function test_api_admin_system_config_detail_retrieval(
  connection: api.IConnection,
) {
  // Authenticate as admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    ip: undefined,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/login",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // Use a random configKey (guaranteed to be missing)
  const missingKey = RandomGenerator.alphaNumeric(20);
  await TestValidator.error(
    "fetch with unknown configKey should error",
    async () => {
      await api.functional.discussionBoard.admin.systemConfigs.at(connection, {
        configKey: missingKey,
      });
    },
  );

  // Simulate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "fetch config as unauthenticated should error",
    async () => {
      await api.functional.discussionBoard.admin.systemConfigs.at(unauthConn, {
        configKey: missingKey,
      });
    },
  );
}
