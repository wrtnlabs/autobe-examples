import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that requesting a non-existent admin session ID returns HTTP 404 Not Found error.
 *
 * Validates the error handling behavior when a super administrator attempts to retrieve
 * an admin session that does not exist in the system. This test ensures proper HTTP
 * status code (404) is returned for invalid session identifiers, protecting against
 * information disclosure while providing clear error feedback.
 *
 * 1. Authenticate as a super administrator with valid credentials
 * 2. Generate a random UUID format string representing a non-existent session
 * 3. Call GET /admin/admin/sessions/{sessionId} using the invalid session identifier
 * 4. Validate HTTP 404 Not Found response is returned
 */
export async function test_api_admin_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a random non-existent session ID (valid UUID format but does not exist)
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. & 4. Call GET /admin/admin/sessions/{sessionId} and validate 404 error
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.sessions.at(
        superAdminConnection,
        {
          sessionId: nonExistentSessionId,
        },
      ),
  );
}
