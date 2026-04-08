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
 * Test retrieving a specific shipping address by its owner.
 *
 * Validates the GET /ecommerceMall/customer/customers/me/addresses/{addressId} endpoint to ensure customers can retrieve their own shipping addresses. Verifies that the returned address contains all required fields matching the created address including recipientName, phone, streetAddress, city, state, postalCode, country, isDefault, and timestamps.
 *
 * **Test Flow:**
 * 1. Register and authenticate as a customer using authorize_customer_join
 * 2. Create a new shipping address with all required fields using generate_random_ecommerce_mall_customer_customers_me_addresses_create
 * 3. Extract the created addressId from the response
 * 4. Call GET /customer/customers/me/addresses/{addressId} with the extracted addressId
 * 5. Verify response contains matching address data
 * 6. Validate all fields are present and correctly populated
 *
 * 1. Customer authentication via authorize_customer_join
 * 2. Address creation via generation function
 * 3. Address retrieval by ID
 * 4. Field-by-field validation against created address
 */
export async function test_api_shipping_address_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create a shipping address
  const createdAddress =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(createdAddress);
  // 3. Retrieve the address by ID
  const retrievedAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.getByAddressid(
      customerConnection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(retrievedAddress);
  // 4. Validate retrieved address matches created address
  TestValidator.equals(
    "address ID matches",
    retrievedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipientName,
    createdAddress.recipientName,
  );
  TestValidator.equals(
    "phone matches",
    retrievedAddress.phone,
    createdAddress.phone,
  );
  TestValidator.equals(
    "street address matches",
    retrievedAddress.streetAddress,
    createdAddress.streetAddress,
  );
  TestValidator.equals(
    "city matches",
    retrievedAddress.city,
    createdAddress.city,
  );
  TestValidator.equals(
    "state matches",
    retrievedAddress.state,
    createdAddress.state,
  );
  TestValidator.equals(
    "postal code matches",
    retrievedAddress.postalCode,
    createdAddress.postalCode,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    createdAddress.country,
  );
  TestValidator.equals(
    "isDefault matches",
    retrievedAddress.isDefault,
    createdAddress.isDefault,
  );
  // Validate timestamps are present
  TestValidator.predicate("created_at is valid", !!retrievedAddress.created_at);
  TestValidator.predicate("updated_at is valid", !!retrievedAddress.updated_at);
}
