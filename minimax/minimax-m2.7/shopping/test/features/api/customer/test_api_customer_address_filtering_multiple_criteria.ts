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
 * Test filtering customer shipping addresses with multiple filter criteria combined as AND conditions.
 *
 * Validates the address filtering functionality by creating multiple addresses with different
 * city/state combinations and verifying that applying multiple filter criteria returns only
 * addresses matching ALL criteria (AND logic). The test creates addresses in Seoul/Gyeonggi,
 * Busan/Gyeongsang, and another in Seoul/Gyeonggi to verify that filtering by city='Seoul'
 * AND state='Gyeonggi' returns only the two Seoul/Gyeonggi addresses.
 *
 * Special attention is given to:
 * - Partial match on city (case-insensitive ILIKE)
 * - Exact match on state and country
 * - Pagination metadata accuracy (records, pages)
 * - Default address flag preservation after filtering
 *
 * 1. Register new customer via customer join endpoint.
 * 2. Create three addresses: Seoul/Gyeonggi, Busan/Gyeongsang, Seoul/Gyeonggi.
 * 3. Set first Seoul address as default.
 * 4. Apply AND filter: city='Seoul', state='Gyeonggi', country='South Korea'.
 * 5. Validate response contains only 2 addresses (matches 1 and 3).
 * 6. Verify Address 1 has is_default=true, Address 3 has is_default=false.
 * 7. Validate pagination shows records=2, pages=1.
 * 8. Test pagination with limit=1 to verify single result returned.
 */
export async function test_api_customer_address_filtering_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create three addresses with different locations
  const address1 =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Kim",
          phone: RandomGenerator.mobile(),
          street_address: "123 Seoul Street",
          city: "Seoul",
          state: "Gyeonggi",
          postal_code: "12345",
          country: "South Korea",
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address1);
  const address2 =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Lee",
          phone: RandomGenerator.mobile(),
          street_address: "456 Busan Avenue",
          city: "Busan",
          state: "Gyeongsang",
          postal_code: "67890",
          country: "South Korea",
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address2);
  const address3 =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Jane Park",
          phone: RandomGenerator.mobile(),
          street_address: "789 Seoul Boulevard",
          city: "Seoul",
          state: "Gyeonggi",
          postal_code: "11223",
          country: "South Korea",
        } satisfies IEcommerceMallShippingAddress.ICreate,
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
    "first address is default",
    defaultAddress.isDefault,
    true,
  );
  // 4. Apply multiple filter criteria (AND logic)
  const filteredResponse =
    await api.functional.ecommerceMall.customer.customers.me.addresses.index(
      customerConnection,
      {
        body: {
          city: "Seoul",
          state: "Gyeonggi",
          country: "South Korea",
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 5. Validate only 2 addresses returned (addresses 1 and 3 match)
  TestValidator.equals(
    "filtered records count",
    filteredResponse.data.length,
    2,
  );
  // 6. Verify correct addresses returned (by recipient name)
  const recipientNames = filteredResponse.data.map(
    (addr) => addr.recipient_name,
  );
  TestValidator.equals(
    "contains John Kim address",
    recipientNames.includes("John Kim"),
    true,
  );
  TestValidator.equals(
    "contains Jane Park address",
    recipientNames.includes("Jane Park"),
    true,
  );
  TestValidator.equals(
    "does not contain John Lee address",
    recipientNames.includes("John Lee"),
    false,
  );
  // 7. Validate default address flag
  const defaultAddr = filteredResponse.data.find(
    (addr) => addr.recipient_name === "John Kim",
  );
  TestValidator.equals("John Kim is default", defaultAddr?.is_default, true);
  const nonDefaultAddr = filteredResponse.data.find(
    (addr) => addr.recipient_name === "Jane Park",
  );
  TestValidator.equals(
    "Jane Park is not default",
    nonDefaultAddr?.is_default,
    false,
  );
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination records",
    filteredResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages",
    filteredResponse.pagination.pages,
    1,
  );
  // 9. Test pagination with limit=1
  const paginatedResponse =
    await api.functional.ecommerceMall.customer.customers.me.addresses.index(
      customerConnection,
      {
        body: {
          city: "Seoul",
          state: "Gyeonggi",
          country: "South Korea",
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated data length",
    paginatedResponse.data.length,
    1,
  );
  TestValidator.equals(
    "paginated records total",
    paginatedResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "paginated pages total",
    paginatedResponse.pagination.pages,
    2,
  );
  TestValidator.equals(
    "paginated limit",
    paginatedResponse.pagination.limit,
    1,
  );
  TestValidator.equals(
    "paginated current page",
    paginatedResponse.pagination.current,
    1,
  );
}
