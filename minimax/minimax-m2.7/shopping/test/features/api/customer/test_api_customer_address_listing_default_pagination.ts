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
 * Test customer shipping address listing with default pagination.
 *
 * Validates the primary success path for listing customer shipping addresses using PATCH /customers/me/addresses with default pagination parameters. This test ensures that when no pagination or filter parameters are provided, the endpoint returns all customer addresses in a properly paginated response.
 *
 * The test flow creates multiple addresses with varying creation timestamps, sets one as the default, and then verifies the listing endpoint returns:
 * - Correct pagination metadata with default values (page 1, limit 20)
 * - All addresses sorted by creation date descending (newest first)
 * - Accurate default address indicator across the response
 * - Complete address summary data including location and recipient information
 *
 * 1. Customer registration with unique email credentials.
 * 2. Creation of 3 shipping addresses with distinct recipient names and locations.
 * 3. Designation of first address as default shipping address.
 * 4. Invocation of address listing endpoint with default pagination.
 * 5. Validation of paginated response structure and address data accuracy.
 * 6. Verification of correct sorting order and default address flag.
 */
export async function test_api_customer_address_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create 3 shipping addresses with distinct data
  const address1 =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Doe",
          phone: RandomGenerator.mobile(),
          street_address: "123 Main Street",
          city: "Seoul",
          state: "Gangnam-gu",
          postal_code: "12345",
          country: "South Korea",
          is_default: false,
        },
      },
    );
  typia.assert(address1);
  // Small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const address2 =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Jane Smith",
          phone: RandomGenerator.mobile(),
          street_address: "456 Oak Avenue",
          city: "Busan",
          state: "Haeundae-gu",
          postal_code: "67890",
          country: "South Korea",
          is_default: false,
        },
      },
    );
  typia.assert(address2);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const address3 =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Bob Wilson",
          phone: RandomGenerator.mobile(),
          street_address: "789 Pine Road",
          city: "Incheon",
          state: "Jung-gu",
          postal_code: "11111",
          country: "South Korea",
          is_default: false,
        },
      },
    );
  typia.assert(address3);
  // 3. Set first address as default
  const defaultAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.set_default.setDefault(
      customerConnection,
      {
        addressId: address1.id,
      },
    );
  typia.assert(defaultAddress);
  TestValidator.equals(
    "first address should be default",
    defaultAddress.isDefault,
    true,
  );
  // 4. Call PATCH /customers/me/addresses with default pagination (empty body)
  const response =
    await api.functional.ecommerceMall.customer.customers.me.addresses.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("total records count", response.pagination.records, 3);
  TestValidator.equals("total pages", response.pagination.pages, 1);
  // 6. Validate data array length
  TestValidator.equals("data array length", response.data.length, 3);
  // 7. Verify addresses are sorted by created_at DESC (newest first)
  // address3 should be first (created last), address1 should be last (created first)
  const addressIds = response.data.map((a) => a.id);
  TestValidator.equals("newest address first", addressIds[0], address3.id);
  TestValidator.equals("oldest address last", addressIds[2], address1.id);
  // 8. Verify exactly one address has is_default=true
  const defaultCount = response.data.filter((a) => a.is_default).length;
  TestValidator.equals("exactly one default address", defaultCount, 1);
  // 9. Verify the default address is the first one created
  const defaultAddressInList = response.data.find((a) => a.is_default);
  TestValidator.equals(
    "default address is address1",
    defaultAddressInList?.id,
    address1.id,
  );
  // 10. Validate all ISummary fields are present
  for (const address of response.data) {
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        address.id,
      ),
    );
    TestValidator.predicate(
      "recipient_name is non-empty",
      address.recipient_name.length > 0,
    );
    TestValidator.predicate("city is non-empty", address.city.length > 0);
    TestValidator.predicate("state is non-empty", address.state.length > 0);
    TestValidator.predicate("country is non-empty", address.country.length > 0);
    TestValidator.predicate(
      "is_default is boolean",
      typeof address.is_default === "boolean",
    );
  }
}
