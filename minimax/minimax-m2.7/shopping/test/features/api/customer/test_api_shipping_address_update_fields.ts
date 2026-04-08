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
 * Test updating shipping address fields.
 *
 * Validates the complete address field update flow for an authenticated customer.
 * The test verifies that multiple address fields can be updated in a single PATCH
 * request and that all changes are correctly persisted in the database.
 *
 * The scenario follows the natural customer journey: after registering and adding
 * an initial shipping address, the customer may need to modify their address details
 * due to moving, changing phone numbers, or correcting entry errors. This test
 * ensures that field-level updates work correctly and timestamps are properly
 * maintained.
 *
 * 1. Customer registers via join endpoint with valid credentials.
 * 2. Customer creates an initial shipping address with complete details.
 * 3. Customer updates multiple address fields (recipient, phone, location).
 * 4. Validates all updated fields match the new values and timestamp is refreshed.
 */
export async function test_api_shipping_address_update_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create initial shipping address
  const newRecipientName = RandomGenerator.name();
  const newPhone = RandomGenerator.mobile();
  const initialAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: newRecipientName,
          phone: newPhone,
          street_address: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
          city: "Seoul",
          state: "Gangnam-gu",
          postal_code: "06017",
          country: "South Korea",
          is_default: false,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(initialAddress);
  const originalUpdatedAt = new Date(initialAddress.updated_at).getTime();
  // 3. Update multiple address fields
  const updatedRecipientName = RandomGenerator.name();
  const updatedPhone = RandomGenerator.mobile();
  const updatedCity = "Busan";
  const updatedState = "Haeundae-gu";
  const updatedPostalCode = "48000";
  const updatedAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: {
          recipient_name: updatedRecipientName,
          phone: updatedPhone,
          city: updatedCity,
          state: updatedState,
          postal_code: updatedPostalCode,
        } satisfies IEcommerceMallShippingAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  // 4. Validate updated fields match input values
  TestValidator.equals(
    "recipient name updated",
    updatedAddress.recipientName,
    updatedRecipientName,
  );
  TestValidator.equals("phone updated", updatedAddress.phone, updatedPhone);
  TestValidator.equals("city updated", updatedAddress.city, updatedCity);
  TestValidator.equals("state updated", updatedAddress.state, updatedState);
  TestValidator.equals(
    "postal code updated",
    updatedAddress.postalCode,
    updatedPostalCode,
  );
  // 5. Validate timestamp is refreshed (new timestamp is greater than original)
  const newUpdatedAt = new Date(updatedAddress.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    newUpdatedAt > originalUpdatedAt,
  );
}
