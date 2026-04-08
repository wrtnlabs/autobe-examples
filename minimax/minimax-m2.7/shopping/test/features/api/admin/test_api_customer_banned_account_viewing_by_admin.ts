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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator can retrieve details of a banned (soft-deleted) customer account.
 *
 * Validates the administrative oversight capability to view customer accounts that have been banned (soft-deleted). This is essential for dispute resolution, order fulfillment, and legal compliance purposes.
 *
 * The test verifies that when an administrator bans a customer:
 * - The banned customer account can still be retrieved by administrators
 * - The deleted_at field is populated with a timestamp
 * - Profile information (display name, phone) is preserved for dispute resolution
 * - Shipping addresses are still accessible for order fulfillment
 * - Orders are preserved for legal compliance
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Customer registers on the platform.
 * 3. Administrator bans the customer account.
 * 4. Administrator retrieves the banned customer details.
 * 5. Validates that all customer information is still accessible with soft-delete timestamp.
 */
export async function test_api_customer_banned_account_viewing_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Administrator bans the customer
  const bannedCustomer =
    await api.functional.ecommerceMall.admin.admin.customers.ban(
      adminConnection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(bannedCustomer);
  // 4. Administrator retrieves the banned customer details
  const retrievedCustomer =
    await api.functional.ecommerceMall.admin.admin.customers.at(
      adminConnection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(retrievedCustomer);
  // 5. Validate the banned customer details
  TestValidator.equals(
    "customer ID matches",
    retrievedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "deleted_at is populated",
    retrievedCustomer.deletedAt !== null,
    true,
  );
  TestValidator.equals(
    "profile is visible",
    retrievedCustomer.profile !== null,
    true,
  );
  TestValidator.equals(
    "shipping addresses returned",
    retrievedCustomer.shippingAddresses !== null,
    true,
  );
  TestValidator.equals(
    "orders array returned",
    retrievedCustomer.orders !== null,
    true,
  );
}
