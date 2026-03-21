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

export async function test_api_customer_addresses_filter_by_default(
  connection: api.IConnection,
): Promise<void> {
  // Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // Create first non-default address
  const address1 =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: { is_default: false },
      },
    );
  typia.assert(address1);
  // Create second address (will be set as default later)
  const address2 =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: { is_default: false },
      },
    );
  typia.assert(address2);
  // Create third non-default address
  const address3 =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: { is_default: false },
      },
    );
  typia.assert(address3);
  // Set the second address as default shipping address
  await api.functional.ecommerceMall.customer.customers.addresses.update(
    customerConnection,
    {
      addressId: address2.id,
      body: {
        is_default: true,
      } satisfies IEcommerceMallShippingAddress.IUpdate,
    },
  );
  // Test filtering with is_default=true
  const defaultAddresses =
    await api.functional.ecommerceMall.customer.customers.addresses.index(
      customerConnection,
      {
        body: {
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(defaultAddresses);
  // Verify only one address is returned with is_default=true
  TestValidator.equals(
    "total addresses with is_default=true",
    defaultAddresses.data.length,
    1,
  );
  TestValidator.equals(
    "is_default field is true",
    defaultAddresses.data[0]!.is_default,
    true,
  );
  TestValidator.equals(
    "pagination records count",
    defaultAddresses.pagination.records,
    1,
  );
  // Test filtering with is_default=false
  const nonDefaultAddresses =
    await api.functional.ecommerceMall.customer.customers.addresses.index(
      customerConnection,
      {
        body: {
          is_default: false,
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(nonDefaultAddresses);
  // Verify two addresses are returned with is_default=false
  TestValidator.equals(
    "total addresses with is_default=false",
    nonDefaultAddresses.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records count for non-default",
    nonDefaultAddresses.pagination.records,
    2,
  );
}
