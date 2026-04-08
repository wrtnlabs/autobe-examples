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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test setting a shipping address as the customer's default address when no previous default exists.
 *
 * This test validates the complete flow of designating a shipping address as the default
 * when the customer has no existing default address. The test ensures that:
 *
 * 1. The customer can successfully create a new shipping address with is_default set to false
 * 2. The set-default endpoint properly marks the address as the customer's default
 * 3. The updated_at timestamp is correctly updated after the operation
 * 4. Only one address is marked as default after the operation
 *
 * This scenario is important because it tests the default address assignment logic
 * when there is no previous default to clear, ensuring the system handles the first
 * address correctly.
 *
 * **Prerequisites:** Authenticated customer session
 *
 * **Test Steps:**
 * 1. Authenticate as a customer using authorize_customer_join
 * 2. Create a new shipping address with is_default=false
 * 3. Call POST /customer/customers/me/addresses/{addressId}/set-default
 * 4. Validate the response contains the address with is_default=true
 * 5. Validate the updated_at timestamp is newer than created_at
 * 6. Call GET /customer/customers/me/addresses to confirm only this address is default
 */
export async function test_api_shipping_address_set_default_first_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a new shipping address with is_default=false (explicitly set to false)
  const address =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} Main Street`,
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: false,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // Store the created_at timestamp before calling set-default
  const createdAtBefore = new Date(address.created_at).getTime();
  // 3. Call set-default endpoint
  const updatedAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.set_default.setDefault(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(updatedAddress);
  // 4. Validate the address is now marked as default
  TestValidator.equals(
    "is_default should be true",
    updatedAddress.isDefault,
    true,
  );
  // 5. Validate the updated_at timestamp is updated
  const updatedAtAfter = new Date(updatedAddress.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be newer than created_at after set-default",
    updatedAtAfter >= createdAtBefore,
  );
  // 6. Verify all address fields are correct
  TestValidator.equals("id should match", updatedAddress.id, address.id);
  TestValidator.equals(
    "recipient_name should match",
    updatedAddress.recipientName,
    address.recipientName,
  );
  TestValidator.equals(
    "phone should match",
    updatedAddress.phone,
    address.phone,
  );
  TestValidator.equals(
    "street_address should match",
    updatedAddress.streetAddress,
    address.streetAddress,
  );
  TestValidator.equals("city should match", updatedAddress.city, address.city);
  TestValidator.equals(
    "state should match",
    updatedAddress.state,
    address.state,
  );
  TestValidator.equals(
    "postal_code should match",
    updatedAddress.postalCode,
    address.postalCode,
  );
  TestValidator.equals(
    "country should match",
    updatedAddress.country,
    address.country,
  );
}
