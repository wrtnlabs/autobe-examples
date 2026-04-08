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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShippingAddress";
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
 * Test retrieving the list of shipping addresses for an authenticated customer who has multiple addresses including one marked as default.
 *
 * Validates the complete shipping address listing functionality including multiple address creation and default address management. Ensures that the list endpoint returns all addresses in the correct order, with proper pagination metadata and the correct default address flag set.
 *
 * The test follows the natural customer workflow: first creating multiple addresses with varying creation times, then designating one as the default through the dedicated set-default endpoint, and finally verifying that the list endpoint returns addresses ordered by creation date with the correct default status.
 *
 * 1. Customer registers with valid credentials.
 * 2. Three shipping addresses are created sequentially (first, second, third).
 * 3. The first address is designated as the default using the set-default endpoint.
 * 4. GET /customers/me/addresses retrieves all non-deleted addresses.
 * 5. Validation confirms: correct count, proper ordering (DESC by created_at), correct default flag assignment, and complete pagination metadata.
 */
export async function test_api_shipping_address_list_multiple_with_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create the first shipping address (will be set as default)
  const firstAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
          city: "Seoul",
          state: "Gangnam-gu",
          postal_code: "06017",
          country: "South Korea",
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  // Small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 3. Create the second shipping address
  const secondAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Second Avenue`,
          city: "Busan",
          state: "Haeundae-gu",
          postal_code: "48000",
          country: "South Korea",
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 4. Create the third shipping address
  const thirdAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Third Boulevard`,
          city: "Incheon",
          state: "Jung-gu",
          postal_code: "22300",
          country: "South Korea",
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(thirdAddress);
  // 5. Set the first address as the default
  const updatedFirstAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.set_default.setDefault(
      customerConnection,
      {
        addressId: firstAddress.id,
      },
    );
  typia.assert(updatedFirstAddress);
  TestValidator.equals(
    "first address is now default",
    updatedFirstAddress.isDefault,
    true,
  );
  // 6. Retrieve all addresses
  const addressList =
    await api.functional.ecommerceMall.customer.customers.me.addresses.get(
      customerConnection,
    );
  typia.assert(addressList);
  // Validation: should contain exactly 3 addresses
  TestValidator.equals("address count", addressList.data.length, 3);
  // Validation: pagination metadata
  TestValidator.equals("pagination current", addressList.pagination.current, 1);
  TestValidator.equals("pagination records", addressList.pagination.records, 3);
  TestValidator.equals("pagination pages", addressList.pagination.pages, 1);
  // Validation: addresses ordered by created_at DESC (newest first)
  // The third address (most recent) should be first in the list
  TestValidator.equals(
    "first item is third address",
    addressList.data[0].id,
    thirdAddress.id,
  );
  TestValidator.equals(
    "second item is second address",
    addressList.data[1].id,
    secondAddress.id,
  );
  TestValidator.equals(
    "third item is first address",
    addressList.data[2].id,
    firstAddress.id,
  );
  // Validation: default flag assignment
  // The first address should now be the default (even though it appears last due to ordering)
  const firstAddressInList = addressList.data.find(
    (a) => a.id === firstAddress.id,
  );
  TestValidator.equals(
    "first address has isDefault true",
    firstAddressInList?.isDefault,
    true,
  );
  const secondAddressInList = addressList.data.find(
    (a) => a.id === secondAddress.id,
  );
  TestValidator.equals(
    "second address has isDefault false",
    secondAddressInList?.isDefault,
    false,
  );
  const thirdAddressInList = addressList.data.find(
    (a) => a.id === thirdAddress.id,
  );
  TestValidator.equals(
    "third address has isDefault false",
    thirdAddressInList?.isDefault,
    false,
  );
  // Validation: all required fields present
  for (const address of addressList.data) {
    TestValidator.predicate("has id", !!address.id);
    TestValidator.predicate("has recipientName", !!address.recipientName);
    TestValidator.predicate("has phone", !!address.phone);
    TestValidator.predicate("has streetAddress", !!address.streetAddress);
    TestValidator.predicate("has city", !!address.city);
    TestValidator.predicate("has state", !!address.state);
    TestValidator.predicate("has postalCode", !!address.postalCode);
    TestValidator.predicate("has country", !!address.country);
    TestValidator.predicate("has created_at", !!address.created_at);
    TestValidator.predicate("has updated_at", !!address.updated_at);
    TestValidator.predicate(
      "isDefault is boolean",
      typeof address.isDefault === "boolean",
    );
  }
}
