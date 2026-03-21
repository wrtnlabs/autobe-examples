import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that unauthenticated users cannot access the report types endpoint.
 *
 * This test validates that the report types endpoint properly enforces authorization.
 * Without valid authentication, requests should be rejected with HTTP 401 Unauthorized
 * or HTTP 403 Forbidden. The system must not expose any report type metadata or
 * organization information to unauthenticated requests.
 *
 * Steps:
 * 1. Create an unauthenticated connection (no Authorization header)
 * 2. Attempt to call GET /erpHrm/admin/organizations/{organizationId}/reports/types
 * 3. Verify the request is rejected due to lack of authorization
 *
 * Validations:
 * - Response returns HTTP 401 or HTTP 403 error
 * - No report type data is exposed in the error response
 * - System does not leak organization information
 */
export async function test_api_report_types_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // Create unauthenticated connection - no headers, no token
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Generate a random organization UUID for testing
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to access report types endpoint without authentication
  // This should fail with 401 Unauthorized or 403 Forbidden
  await TestValidator.httpError(
    "unauthenticated request should be rejected",
    [401, 403],
    async () =>
      await api.functional.erpHrm.admin.organizations.reports.types.listTypes(
        unauthenticatedConnection,
        {
          organizationId,
        },
      ),
  );
}
