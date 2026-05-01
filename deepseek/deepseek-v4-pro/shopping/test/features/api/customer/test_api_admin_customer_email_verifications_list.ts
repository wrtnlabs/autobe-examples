import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator can retrieve the complete email verification audit trail for a specific customer.
 *
 * Validates that the email verification listing endpoint returns a properly paginated response with all required fields. Each verification record includes the token prefix (never the full token), expiration status, and timestamps. Special attention is given to verifying that records are sorted newest first by default and that newly created tokens are correctly marked as active rather than expired.
 *
 * 1. Administrator creates an account and authenticates via join.
 * 2. Customer registers a new account, which automatically generates email verification token records.
 * 3. Administrator retrieves the customer's email verification history with an empty request body (no filters).
 * 4. Validates pagination structure, record sorting, and is_expired accuracy.
 */
export async function test_api_admin_customer_email_verifications_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration (generates email verification token records)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Retrieve email verification audit trail with no filters
  const result =
    await api.functional.shoppingMall.admin.customers.email_verifications.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {} satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate records exist
  TestValidator.predicate("has verification records", result.data.length > 0);
  // 5. Validate records sorted by created_at descending (newest first)
  if (result.data.length >= 2) {
    for (let i = 0; i < result.data.length - 1; i++) {
      TestValidator.predicate(
        "sorted newest first",
        new Date(result.data[i].created_at).getTime() >=
          new Date(result.data[i + 1].created_at).getTime(),
      );
    }
  }
  // 6. Validate is_expired accuracy — tokens created moments ago must be active
  for (const record of result.data) {
    TestValidator.equals("token is active", record.is_expired, false);
  }
}
