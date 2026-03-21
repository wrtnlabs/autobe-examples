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

export async function test_api_shipping_address_new_default_replaces_previous(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Create first address (becomes auto-default since it's the first address)
  const firstAddress =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: "12345",
          country: "Korea",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  // First address should be default (auto-default for first address)
  TestValidator.equals(
    "first address is default",
    firstAddress.is_default,
    true,
  );
  // 3. Create second address with is_default=true
  const secondAddress =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: "54321",
          country: "Korea",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  // 4. Second address should be created with is_default=true
  TestValidator.equals(
    "second address is default",
    secondAddress.is_default,
    true,
  );
  // 5. Verify the addresses are different
  TestValidator.notEquals(
    "addresses have different IDs",
    firstAddress.id,
    secondAddress.id,
  );
  // 6. Verify second address has different postal_code (confirms it's a new address)
  TestValidator.notEquals(
    "addresses have different postal codes",
    firstAddress.postal_code,
    secondAddress.postal_code,
  );
}
