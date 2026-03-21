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

export async function test_api_customer_addresses_search_by_recipient_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create three addresses with different recipient names and cities
  // - "John Smith" in Seoul
  // - "Johnny Brown" in Busan
  // - "Jane Doe" in Seoul
  const johnSmithAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Smith",
          city: "Seoul",
        },
      },
    );
  typia.assert(johnSmithAddress);
  const johnnyBrownAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Johnny Brown",
          city: "Busan",
        },
      },
    );
  typia.assert(johnnyBrownAddress);
  const janeDoeAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Jane Doe",
          city: "Seoul",
        },
      },
    );
  typia.assert(janeDoeAddress);
  // 3. Search addresses with partial match "John" on recipient_name
  // Should return both "John Smith" and "Johnny Brown"
  const searchJohnResult =
    await api.functional.ecommerceMall.customer.customers.addresses.index(
      customerConnection,
      {
        body: {
          search: "John",
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(searchJohnResult);
  // Verify only 2 addresses match the partial search
  TestValidator.equals(
    "records count for 'John' search",
    searchJohnResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records for 'John' search",
    searchJohnResult.pagination.records,
    2,
  );
  // Verify the matching addresses contain "John" in recipient_name
  const johnRecipientNames = searchJohnResult.data.map((a) => a.recipient_name);
  TestValidator.predicate(
    "John Smith is in results",
    johnRecipientNames.some((name) => name === "John Smith"),
  );
  TestValidator.predicate(
    "Johnny Brown is in results",
    johnRecipientNames.some((name) => name === "Johnny Brown"),
  );
  TestValidator.predicate(
    "Jane Doe is NOT in results",
    !johnRecipientNames.some((name) => name === "Jane Doe"),
  );
  // 4. Test city filter - should return addresses in Seoul only
  const seoulAddresses =
    await api.functional.ecommerceMall.customer.customers.addresses.index(
      customerConnection,
      {
        body: {
          city: "Seoul",
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(seoulAddresses);
  // Verify only Seoul addresses are returned
  TestValidator.equals(
    "pagination records for Seoul filter",
    seoulAddresses.pagination.records,
    2,
  );
  const seoulRecipientNames = seoulAddresses.data.map((a) => a.recipient_name);
  TestValidator.predicate(
    "John Smith (Seoul) is in results",
    seoulRecipientNames.some((name) => name === "John Smith"),
  );
  TestValidator.predicate(
    "Jane Doe (Seoul) is in results",
    seoulRecipientNames.some((name) => name === "Jane Doe"),
  );
  TestValidator.predicate(
    "Johnny Brown (Busan) is NOT in results",
    !seoulRecipientNames.some((name) => name === "Johnny Brown"),
  );
  // 5. Test combined search and city filter
  // Search for "John" AND city "Seoul" - should only return "John Smith"
  const combinedSearchResult =
    await api.functional.ecommerceMall.customer.customers.addresses.index(
      customerConnection,
      {
        body: {
          search: "John",
          city: "Seoul",
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(combinedSearchResult);
  TestValidator.equals(
    "records count for combined search",
    combinedSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination records for combined search",
    combinedSearchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "Only John Smith matches combined search",
    combinedSearchResult.data[0]?.recipient_name,
    "John Smith",
  );
}
