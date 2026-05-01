import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that querying email verification records for a non-existent customer returns an error.
 *
 * Validates the business rule that customer existence is a prerequisite for retrieving email verification records. When an administrator attempts to query verification records for a customer ID that does not correspond to any existing customer, the endpoint must reject the request before any database query against the verification table is performed.
 *
 * 1. Administrator authenticates via join operation, creating an authenticated session.
 * 2. A valid UUID is generated that does not match any existing customer in the database.
 * 3. The email verification listing endpoint is called with the non-existent customer ID.
 * 4. The request fails with an error, confirming the customer existence prerequisite check.
 */
export async function test_api_admin_customer_email_verifications_customer_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a non-existent customer UUID
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to query email verifications for non-existent customer
  await TestValidator.error("customer not found", async () => {
    await api.functional.shoppingMall.admin.customers.email_verifications.index(
      adminConnection,
      {
        customerId: nonExistentCustomerId,
        body: {} satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  });
}
