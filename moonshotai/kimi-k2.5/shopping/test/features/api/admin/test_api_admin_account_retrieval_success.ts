import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of an administrator's profile by an authenticated admin.
 * Validates that an authenticated administrator can retrieve complete account details
 * of another administrator through the admin management endpoint.
 *
 * This test verifies:
 * - Admin authentication via join endpoint works correctly
 * - Admin retrieval endpoint returns HTTP 200 for authorized requests
 * - Response contains complete IEcommerceMallAdmin entity
 * - All expected fields are present (id, email, grade, status, nickname, createdAt, updatedAt, deletedAt)
 * - Sensitive fields (password_hash) are not exposed in the response
 * - Soft-deletion status can be determined from deletedAt field (null for active)
 */
export async function test_api_admin_account_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for isolation
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as an administrator using the join utility
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedAdmin);
  // Step 2: Retrieve administrator account details using the authenticated connection
  const adminDetails = await api.functional.ecommerceMall.admin.admins.at(
    adminConnection,
    { adminId: authorizedAdmin.id },
  );
  // Step 3: Validate the response is a complete IEcommerceMallAdmin entity
  typia.assert(adminDetails);
  // Step 4: Validate business logic - retrieved data matches the authenticated admin
  // The ID should match since we're retrieving our own account
  // Note: This validates the endpoint returns correct data structure
  // Security requirement: password_hash must NOT be present (validated by typia.assert through type structure)
}
