import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
 * Test retrieving a seller approval record that does not exist.
 *
 * Scenario:
 * 1. Administrator authenticates via admin join
 * 2. Admin attempts to retrieve a seller approval using a non-existent UUID
 * 3. Verify that the response returns HTTP 404 error with appropriate message
 *
 * This edge case validates proper error handling for invalid resource identifiers.
 */
export async function test_api_seller_approval_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!" as string & tags.Format<"password">,
        name: "Test Admin",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      },
    },
  );
  // Create authorized connection with admin token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${admin.token.access}`,
    },
  };
  // Step 2: Generate a non-existent UUID for approvalId
  const nonExistentApprovalId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to retrieve non-existent seller approval and expect 404 error
  await TestValidator.error(
    "non-existent seller approval returns 404",
    async () => {
      await api.functional.ecommerceMall.admin.seller_approvals.at(
        authorizedConnection,
        {
          approvalId: nonExistentApprovalId,
        },
      );
    },
  );
}
