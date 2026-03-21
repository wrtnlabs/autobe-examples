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

/**
 * Test shipping address update by the authenticated customer owner.
 *
 * 1. Register a new customer account with valid credentials
 * 2. Create a new shipping address with complete information
 * 3. Verify the address was created successfully
 * 4. Update the address using PUT with new values for all fields
 * 5. Validate the response returns complete updated address record
 * 6. Verify all fields were updated correctly
 * 7. Verify updated_at timestamp reflects the update time
 */
export async function test_api_shipping_address_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create a shipping address with initial values
  const initialAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "John Doe",
          phone: "1234567890",
          street_address: "123 Main St",
          city: "Seoul",
          state: "Gyeonggi",
          postal_code: "12345",
          country: "South Korea",
          is_default: false,
        },
      },
    );
  typia.assert(initialAddress);
  // Store initial updated_at for comparison
  const initialUpdatedAt = initialAddress.updated_at;
  // 3. Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Update the address with new values
  const updatedAddress =
    await api.functional.ecommerceMall.customer.customers.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: {
          recipient_name: "Jane Doe",
          phone: "0987654321",
          street_address: "456 New Ave",
          city: "Busan",
          state: "Jeonnam",
          postal_code: "54321",
          country: "South Korea",
        } satisfies IEcommerceMallShippingAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  // 5. Validate the response contains complete updated address
  TestValidator.equals(
    "address id preserved",
    updatedAddress.id,
    initialAddress.id,
  );
  TestValidator.equals(
    "recipient_name updated",
    updatedAddress.recipient_name,
    "Jane Doe",
  );
  TestValidator.equals("phone updated", updatedAddress.phone, "0987654321");
  TestValidator.equals(
    "street_address updated",
    updatedAddress.street_address,
    "456 New Ave",
  );
  TestValidator.equals("city updated", updatedAddress.city, "Busan");
  TestValidator.equals("state updated", updatedAddress.state, "Jeonnam");
  TestValidator.equals(
    "postal_code updated",
    updatedAddress.postal_code,
    "54321",
  );
  TestValidator.equals(
    "country preserved",
    updatedAddress.country,
    "South Korea",
  );
  // 6. Verify updated_at timestamp reflects the update (should be newer than initial)
  TestValidator.predicate("updated_at is newer than initial", () => {
    return new Date(updatedAddress.updated_at) > new Date(initialUpdatedAt);
  });
}
