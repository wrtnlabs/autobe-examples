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

export async function test_api_shipping_address_update_default_switch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first shipping address with is_default = true
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
  TestValidator.equals(
    "first address is_default is true",
    firstAddress.is_default,
    true,
  );
  // 3. Create second shipping address with is_default = false
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
  TestValidator.equals(
    "second address is_default is false",
    secondAddress.is_default,
    false,
  );
  // 4. Update second address to set it as the new default
  const updatedSecondAddress =
    await api.functional.ecommerceMall.customer.customers.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: {
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.IUpdate,
      },
    );
  typia.assert(updatedSecondAddress);
  TestValidator.equals(
    "updated second address is_default is true",
    updatedSecondAddress.is_default,
    true,
  );
  // 5. Verify first address now has is_default = false (automatic switch)
  // Re-fetch first address to confirm the automatic switch
  const reFetchedFirstAddress =
    await api.functional.ecommerceMall.customer.customers.addresses.update(
      customerConnection,
      {
        addressId: firstAddress.id,
        body: {},
      },
    );
  typia.assert(reFetchedFirstAddress);
  TestValidator.equals(
    "first address is_default is now false after switch",
    reFetchedFirstAddress.is_default,
    false,
  );
}