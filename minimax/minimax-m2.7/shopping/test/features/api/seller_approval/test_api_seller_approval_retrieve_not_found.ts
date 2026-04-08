import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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
 * Test retrieving a seller approval with a non-existent approvalId.
 *
 * Validates the system's error handling when attempting to retrieve a seller approval record that does not exist. This test ensures that:
 * - The endpoint properly validates the existence of the requested approvalId
 * - A 404 Not Found response is returned when the approvalId does not match any existing record
 * - The error response is properly formatted and informative
 *
 * **Test Flow:**
 * 1. Authenticate as an administrator using the admin join utility function
 * 2. Generate a random UUID that does not exist in the database
 * 3. Attempt to retrieve the seller approval using the non-existent UUID
 * 4. Validate that the API returns a 404 Not Found HTTP error
 */
export async function test_api_seller_approval_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a random UUID that does not exist in the database
  const nonExistentApprovalId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve a non-existent seller approval
  // 4. Validate that a 404 Not Found error is returned
  await TestValidator.httpError(
    "non-existent seller approval should return 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.seller_approvals.at(
        adminConnection,
        {
          approvalId: nonExistentApprovalId,
        },
      ),
  );
}
