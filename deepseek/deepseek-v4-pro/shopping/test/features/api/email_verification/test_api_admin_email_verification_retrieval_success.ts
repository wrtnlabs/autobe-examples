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
 * Test administrator retrieval of a customer's email verification record.
 *
 * Validates that an administrator can access any customer's full email
 * verification record through the detail endpoint. The response includes the
 * complete token string, expiration and creation timestamps, and the nested
 * customer summary for scoping verification.
 *
 * The nested customer summary must match the customerId path parameter,
 * confirming that the scoping by customerId works correctly. The token's
 * expired_at should be in the future, confirming the token is still valid at
 * retrieval time.
 *
 * 1. Administrator registers on the platform.
 * 2. Customer registers, generating an email verification token record.
 * 3. Administrator lists the customer's verification records to discover IDs.
 * 4. Administrator retrieves one specific verification record by its ID.
 * 5. Validates the record's token is non-empty, expired_at is in the future,
 *    and the nested customer summary matches the target customer.
 */
export async function test_api_admin_email_verification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registers, generating an email verification token
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Admin lists the customer's email verification records
  const page =
    await api.functional.shoppingMall.admin.customers.email_verifications.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {} satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(page);
  const summary = typia.assert(page.data[0]!);
  // 4. Admin retrieves the specific verification record
  const verification =
    await api.functional.shoppingMall.admin.customers.email_verifications.at(
      adminConnection,
      {
        customerId: customer.id,
        verificationId: summary.id,
      },
    );
  typia.assert(verification);
  // 5. Validate business logic
  TestValidator.equals(
    "verification id matches summary",
    verification.id,
    summary.id,
  );
  TestValidator.equals(
    "customer summary scoped to target customer",
    verification.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email in summary",
    verification.customer.email,
    customer.email,
  );
  TestValidator.predicate(
    "token is non-empty string",
    verification.token.length > 0,
  );
  TestValidator.predicate(
    "token is still valid (expired_at in the future)",
    new Date(verification.expired_at) > new Date(),
  );
}
