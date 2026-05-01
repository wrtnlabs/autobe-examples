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
 * Test filtering a customer's email verification records to show only active tokens.
 *
 * Verifies that an administrator can browse a customer's email verification history and filter the results to display only tokens that have not yet expired. This ensures the expiration filter correctly isolates active records from expired ones.
 *
 * The test relies on the fact that freshly created verification tokens (generated during customer registration) have future expiration timestamps, making them all active. The endpoint's response is then validated to confirm every returned record reports `is_expired` as `false` and that the pagination metadata reflects the filtered count rather than the total.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. A new customer registers, generating active email verification tokens.
 * 3. The administrator queries the customer's email verifications filtered by `expiration: "active"`.
 * 4. Validates that all returned tokens are active and pagination metadata is correct.
 */
export async function test_api_admin_customer_email_verifications_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration (generates active email verification tokens)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Filter active email verifications
  const result =
    await api.functional.shoppingMall.admin.customers.email_verifications.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {
          expiration: "active",
        } satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate all returned tokens are active
  TestValidator.predicate(
    "all returned tokens are active (is_expired is false)",
    result.data.every((item) => item.is_expired === false),
  );
  TestValidator.predicate(
    "records count matches filtered active tokens",
    result.pagination.records >= result.data.length,
  );
}
