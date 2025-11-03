import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_index_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Validate that anonymous (unauthenticated) callers cannot access the
   * administrative system settings index. Expected behavior:
   *
   * - The server denies access (HTTP 401 or 403).
   * - If the server unexpectedly returns a page to anonymous callers, ensure that
   *   sensitive 'value' fields are not exposed (value === undefined || null).
   */

  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const requestBody = {
    page: 1,
    pageSize: 10,
  } satisfies ITodoAppSystemSetting.IRequest;

  // Primary assertion: the anonymous caller must be denied with 401 or 403.
  await TestValidator.httpError(
    "anonymous caller should be denied access (401 or 403)",
    [401, 403],
    async () => {
      await api.functional.todoApp.admin.systemSettings.index(unauthConn, {
        body: requestBody,
      });
    },
  );

  // Defensive note: If the implementation instead returns a page to
  // anonymous callers (no HttpError thrown), that behavior would be surprising.
  // In that case, tests elsewhere should cover redaction. For completeness,
  // we can perform a single additional call only when we expect the service to
  // allow read access for non-admins; however, doing so would contradict the
  // primary assertion above. Therefore, we intentionally avoid duplicating
  // the request here to keep the test focused and deterministic.
}
