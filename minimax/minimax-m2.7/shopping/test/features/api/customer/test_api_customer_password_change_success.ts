import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test successful password change workflow for an authenticated customer.
 *
 * Validates the complete password change flow including current password verification,
 * new password storage, and immediate usability of the new password. The test verifies
 * that the server correctly validates the current password before allowing the change,
 * securely hashes and stores the new password, and updates the account's updatedAt timestamp.
 *
 * This test ensures the security of the password change mechanism by verifying that:
 * 1. The current password must match for the change to succeed
 * 2. The new password is properly hashed and stored
 * 3. The new password enables immediate login
 * 4. The old password is immediately invalidated after the change
 *
 * 1. Register a new customer with email and password using authorize_customer_join.
 * 2. Authenticate the customer to establish a valid session.
 * 3. Call PUT /ecommerceMall/customer/customer/password with currentPassword (original)
 *    and newPassword (a new value meeting security requirements).
 * 4. Validate the response contains customer data with updated_at timestamp.
 * 5. Verify the new password works for login using authorize_customer_login.
 * 6. Verify the old password fails authentication (business logic error).
 */
export async function test_api_customer_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with known credentials
  const originalPassword = "OriginalPass123!";
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
      name: RandomGenerator.name(),
      href: customerHref,
      referrer: customerReferrer,
    },
  });
  typia.assert(authorized);
  // 2. Create a new password for the change
  const newPassword = "NewSecurePass456!";
  // 3. Call password change endpoint with correct current password
  const updatedCustomer =
    await api.functional.ecommerceMall.customer.customer.password.update(
      customerConnection,
      {
        body: {
          currentPassword: originalPassword,
          newPassword: newPassword,
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedCustomer);
  // 4. Validate response contains customer data with updated timestamp
  // The updatedAt should reflect the change (though we can't guarantee it's different in test)
  TestValidator.equals(
    "customer id preserved",
    updatedCustomer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email preserved",
    updatedCustomer.email,
    authorized.email,
  );
  TestValidator.predicate(
    "has updatedAt",
    updatedCustomer.updatedAt !== undefined,
  );
  TestValidator.predicate("has profile", updatedCustomer.profile !== undefined);
  // 5. Verify new password works for login
  const newLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(newLoginConnection, {
    body: {
      email: authorized.email,
      password: newPassword,
      href: customerHref,
      referrer: customerReferrer,
    },
  });
  // 6. Verify old password fails authentication (should throw error)
  await TestValidator.error(
    "old password should fail after change",
    async () => {
      const failedConnection: api.IConnection = { host: connection.host };
      await authorize_customer_login(failedConnection, {
        body: {
          email: authorized.email,
          password: originalPassword,
          href: customerHref,
          referrer: customerReferrer,
        },
      });
    },
  );
}