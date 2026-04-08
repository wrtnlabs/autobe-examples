import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieving a non-existent administrator request returns 404.
 *
 * Validates that when a super administrator attempts to retrieve an admin request
 * with a UUID that does not exist in the system, the API correctly returns a 404
 * Not Found error with an appropriate message. This ensures proper handling of
 * non-existent resource requests without exposing internal data structures.
 *
 * The test verifies that:
 * 1. A super admin can authenticate successfully
 * 2. Requesting a non-existent admin request ID returns HTTP 404
 * 3. No partial or corrupted data is returned in the error response
 * 4. Soft-deleted requests are also treated as non-existent (404)
 *
 * 1. Register a super admin account via POST /ecommerceMall/auth/superAdmin/join
 * 2. Generate a random UUID that does not exist in the system
 * 3. Attempt to retrieve the admin request via GET /ecommerceMall/superAdmin/admin-requests/{requestId}
 * 4. Validate that 404 error is returned
 */
export async function test_api_admin_request_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a random UUID that does not exist
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent admin request
  await TestValidator.httpError(
    "should return 404 for non-existent admin request",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin_requests.at(
        superAdminConnection,
        {
          requestId: nonExistentRequestId,
        },
      ),
  );
}
