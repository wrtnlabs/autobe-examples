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
 * Test retrieving a specific shipping address by its unique identifier after successful creation.
 *
 * Validates the complete flow of retrieving a customer shipping address by its UUID.
 * This test ensures data isolation by authenticating as a customer, creating an address,
 * and retrieving it using the generated UUID. The retrieved address must contain all
 * the same field values as the created address, confirming proper data storage and retrieval.
 *
 * 1. Customer registers with email and password via authorize_customer_join utility
 * 2. Create a new shipping address with all required fields using generation utility
 * 3. Retrieve the address using the GET /ecommerceMall/customer/addresses/{addressId} endpoint
 * 4. Validate that all address fields (recipientName, phone, streetAddress, city, state,
 *    postalCode, country, isDefault) match between created and retrieved addresses
 * 5. Verify timestamps (created_at, updated_at) are present in the response
 * 6. Confirm the address ID is a valid UUID
 */
export async function test_api_shipping_address_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create shipping address
  const createdAddress =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(createdAddress);
  // 3. Retrieve address by its UUID
  const retrievedAddress =
    await api.functional.ecommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(retrievedAddress);
  // 4. Validate retrieved address matches created address
  TestValidator.equals(
    "address id matches",
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
}
