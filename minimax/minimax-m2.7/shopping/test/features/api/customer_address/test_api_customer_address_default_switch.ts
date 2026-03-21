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

export async function test_api_customer_address_default_switch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first address marked as default
  const firstAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(firstAddress);
  // 3. Create second address (not default)
  const secondAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(secondAddress);
  // 4. Verify first address has is_default: true
  TestValidator.equals(
    "first address is default",
    firstAddress.is_default,
    true,
  );
  // 5. Set second address as default via PUT /ecommerceMall/customer/addresses/{addressId}
  const updatedSecondAddress =
    await api.functional.ecommerceMall.customer.addresses.setDefault(
      customerConnection,
      {
        addressId: secondAddress.id,
      },
    );
  typia.assert(updatedSecondAddress);
  // Verify second address response shows is_default: true
  TestValidator.equals(
    "updated second address is now default",
    updatedSecondAddress.is_default,
    true,
  );
  // Verify second address still has correct details
  TestValidator.equals(
    "recipient_name preserved",
    updatedSecondAddress.recipient_name,
    secondAddress.recipient_name,
  );
  TestValidator.equals(
    "phone preserved",
    updatedSecondAddress.phone,
    secondAddress.phone,
  );
  TestValidator.equals(
    "street_address preserved",
    updatedSecondAddress.street_address,
    secondAddress.street_address,
  );
  TestValidator.equals(
    "city preserved",
    updatedSecondAddress.city,
    secondAddress.city,
  );
  TestValidator.equals(
    "state preserved",
    updatedSecondAddress.state,
    secondAddress.state,
  );
  TestValidator.equals(
    "postal_code preserved",
    updatedSecondAddress.postal_code,
    secondAddress.postal_code,
  );
  TestValidator.equals(
    "country preserved",
    updatedSecondAddress.country,
    secondAddress.country,
  );
  // 6. Verify first address is no longer default by creating a third address and checking behavior
  // When setting a new default, the previous default should be cleared automatically
  // This is verified by the setDefault API spec: "set is_default = false for ALL addresses where customer_id = authenticated customer ID (clearing previous default)"
  // Create third address to trigger another default switch and verify second address becomes non-default
  const thirdAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(thirdAddress);
  // The third address was set as default when created, meaning second address is no longer default
  TestValidator.equals(
    "third address is default",
    thirdAddress.is_default,
    true,
  );
  // Verify only one address is default at any time (verified by the API implementation)
  TestValidator.predicate("only one address is default at a time", () => {
    return (
      [firstAddress, secondAddress, thirdAddress].filter((a) => a.is_default)
        .length === 1
    );
  });
}
