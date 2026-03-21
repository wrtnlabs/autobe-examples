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

export async function test_api_shipping_address_first_address_auto_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account via POST /ecommerceMall/auth/customer/join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Update connection with the token from registration
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a new shipping address with is_default=false (even though it should become true)
  const addressBody = {
    recipient_name: "John Doe",
    phone: "+1-555-123-4567",
    street_address: "123 Main Street, Apt 4B",
    city: "New York",
    state: "NY",
    postal_code: "10001",
    country: "United States",
    is_default: false,
  } satisfies IEcommerceMallShippingAddress.ICreate;
  const createdAddress =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: addressBody,
      },
    );
  typia.assert(createdAddress);
  // 3. Assert the response returns the created address with system-generated UUID (valid UUID format)
  TestValidator.predicate(
    "address has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdAddress.id,
    ),
  );
  // 4. Assert is_default is true even though false was sent in request (auto-default business rule)
  TestValidator.equals(
    "first address is auto-default despite sending false",
    createdAddress.is_default,
    true,
  );
  // 5. Verify the address contains all submitted data exactly as provided
  TestValidator.equals(
    "recipient_name matches",
    createdAddress.recipient_name,
    addressBody.recipient_name,
  );
  TestValidator.equals(
    "phone matches",
    createdAddress.phone,
    addressBody.phone,
  );
  TestValidator.equals(
    "street_address matches",
    createdAddress.street_address,
    addressBody.street_address,
  );
  TestValidator.equals("city matches", createdAddress.city, addressBody.city);
  TestValidator.equals(
    "state matches",
    createdAddress.state,
    addressBody.state,
  );
  TestValidator.equals(
    "postal_code matches",
    createdAddress.postal_code,
    addressBody.postal_code,
  );
  TestValidator.equals(
    "country matches",
    createdAddress.country,
    addressBody.country,
  );
  // Verify timestamps exist
  TestValidator.predicate(
    "has created_at timestamp",
    createdAddress.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    createdAddress.updated_at.length > 0,
  );
  // Verify customer association
  TestValidator.equals(
    "customer id matches authorized customer",
    createdAddress.customer.id,
    authorized.id,
  );
}
