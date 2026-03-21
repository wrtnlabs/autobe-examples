import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test retrieving a paginated list of customer shipping addresses with default sorting (newest first).
 *
 * This test validates the address list endpoint by:
 * 1. Registering a new customer account
 * 2. Creating multiple shipping addresses with different recipient names and cities
 * 3. Calling the list endpoint with default pagination parameters
 * 4. Verifying response contains correct pagination metadata and addresses are sorted newest first
 */
export async function test_api_customer_addresses_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {});
  typia.assert(joined);
  // 2. Create multiple shipping addresses with different cities
  const address1 =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Doe",
          city: "Seoul",
          state: "Gangnam-gu",
          country: "South Korea",
        },
      },
    );
  typia.assert(address1);
  const address2 =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Jane Smith",
          city: "Busan",
          state: "Haeundae-gu",
          country: "South Korea",
        },
      },
    );
  typia.assert(address2);
  const address3 =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Bob Wilson",
          city: "Incheon",
          state: "Jung-gu",
          country: "South Korea",
        },
      },
    );
  typia.assert(address3);
  // 3. Call the list endpoint with default pagination (newest first by default)
  const listResponse =
    await api.functional.ecommerceMall.customer.customers.addresses.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(listResponse);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "total count matches created addresses",
    listResponse.pagination.records,
    3,
  );
  // 5. Verify addresses are returned in descending order by created_at (newest first)
  TestValidator.equals(
    "addresses sorted newest first",
    listResponse.data[0].id,
    address3.id,
  );
  TestValidator.equals("second address", listResponse.data[1].id, address2.id);
  TestValidator.equals("third address", listResponse.data[2].id, address1.id);
  // 6. Verify each address contains all required fields
  for (const addr of listResponse.data) {
    TestValidator.predicate("has id", !!addr.id);
    TestValidator.predicate("has recipient_name", !!addr.recipient_name);
    TestValidator.predicate("has phone", !!addr.phone);
    TestValidator.predicate("has street_address", !!addr.street_address);
    TestValidator.predicate("has city", !!addr.city);
    TestValidator.predicate("has state", !!addr.state);
    TestValidator.predicate("has postal_code", !!addr.postal_code);
    TestValidator.predicate("has country", !!addr.country);
    TestValidator.predicate("has is_default", addr.is_default !== undefined);
    TestValidator.predicate("has created_at", !!addr.created_at);
    TestValidator.predicate("has updated_at", !!addr.updated_at);
    TestValidator.predicate("has customer object", !!addr.customer);
  }
  // 7. Verify only non-deleted addresses are returned
  TestValidator.equals(
    "no deleted addresses returned",
    listResponse.data.length,
    3,
  );
}
