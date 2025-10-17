import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Validate 404 on reading a non-existent topic by UUID without authentication.
 *
 * Business purpose:
 *
 * - Topic detail endpoint must be publicly readable and return 404 when the
 *   requested resource does not exist or is retired.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection (empty headers) to simulate public
 *    access.
 * 2. Generate a random well-formed UUID that is expected not to exist.
 * 3. GET /econDiscuss/topics/{topicId} with unauthenticated connection and expect
 *    HTTP 404.
 * 4. Repeat the same call using the original connection (may or may not be
 *    authenticated) and still expect HTTP 404, confirming auth-independence for
 *    unknown resources.
 */
export async function test_api_topic_read_by_id_nonexistent_returns_404(
  connection: api.IConnection,
) {
  // 1) Unauthenticated connection clone (do not mutate headers after creation)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Generate a random, well-formed UUID assumed to be non-existent
  const missingId = typia.random<string & tags.Format<"uuid">>();

  // 3) Expect 404 when unauthenticated
  await TestValidator.httpError(
    "non-existent topic returns 404 (unauthenticated)",
    404,
    async () => {
      return await api.functional.econDiscuss.topics.at(unauthConn, {
        topicId: missingId,
      });
    },
  );

  // 4) Expect 404 regardless of auth state (using provided connection)
  await TestValidator.httpError(
    "non-existent topic returns 404 (any auth state)",
    404,
    async () => {
      return await api.functional.econDiscuss.topics.at(connection, {
        topicId: missingId,
      });
    },
  );
}
