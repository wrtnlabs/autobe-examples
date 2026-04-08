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
 * Test that updating a default shipping address preserves its default status.
 *
 * Validates the business rule that when a customer updates their default shipping address,
 * the is_default flag remains true. This ensures that editing address details does not
 * accidentally clear the default status, preventing customers from losing their preferred
 * shipping address selection.
 *
 * The test creates multiple addresses, sets one as default, updates it with new values
 * for all fields, and verifies both the default preservation and correct field updates.
 *
 * 1. Customer authenticates and creates multiple shipping addresses.
 * 2. One address is designated as the default via set-default endpoint.
 * 3. The default address is updated with new values for all fields.
 * 4. Validates that is_default remains true after the update.
 * 5. Validates that all other address fields reflect the new values.
 */
export async function test_api_customer_address_update_default_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create multiple shipping addresses
  const address1 =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address1);
  const address2 =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address2);
  // 3. Set address1 as default
  const defaultAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.set_default.setDefault(
      customerConnection,
      {
        addressId: address1.id,
      },
    );
  typia.assert(defaultAddress);
  // Verify address1 is now the default
  TestValidator.equals(
    "address1 should be default",
    defaultAddress.isDefault,
    true,
  );
  // 4. Update the default address with new values for all fields
  const updatedAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: defaultAddress.id,
        body: {
          recipient_name: `Updated ${RandomGenerator.name()}`,
          phone: RandomGenerator.mobile(),
          street_address: `Updated Street ${RandomGenerator.alphabets(8)}`,
          city: `Updated City ${RandomGenerator.alphabets(4)}`,
          state: `Updated State ${RandomGenerator.alphabets(4)}`,
          postal_code: `00000${RandomGenerator.alphabets(2).toUpperCase()}`,
          country: `Updated Country ${RandomGenerator.alphabets(5)}`,
        } satisfies IEcommerceMallShippingAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  // 5. Validate default status is preserved
  TestValidator.equals(
    "is_default should be preserved after update",
    updatedAddress.isDefault,
    true,
  );
  // 6. Validate all fields are updated correctly
  const updateBody = {
    recipient_name: `Updated ${RandomGenerator.name()}`,
    phone: RandomGenerator.mobile(),
    street_address: `Updated Street ${RandomGenerator.alphabets(8)}`,
    city: `Updated City ${RandomGenerator.alphabets(4)}`,
    state: `Updated State ${RandomGenerator.alphabets(4)}`,
    postal_code: `00000${RandomGenerator.alphabets(2).toUpperCase()}`,
    country: `Updated Country ${RandomGenerator.alphabets(5)}`,
  };
  TestValidator.equals(
    "recipient_name should be updated",
    updatedAddress.recipientName,
    updateBody.recipient_name,
  );
  TestValidator.equals(
    "phone should be updated",
    updatedAddress.phone,
    updateBody.phone,
  );
  TestValidator.equals(
    "street_address should be updated",
    updatedAddress.streetAddress,
    updateBody.street_address,
  );
  TestValidator.equals(
    "city should be updated",
    updatedAddress.city,
    updateBody.city,
  );
  TestValidator.equals(
    "state should be updated",
    updatedAddress.state,
    updateBody.state,
  );
  TestValidator.equals(
    "postal_code should be updated",
    updatedAddress.postalCode,
    updateBody.postal_code,
  );
  TestValidator.equals(
    "country should be updated",
    updatedAddress.country,
    updateBody.country,
  );
}
