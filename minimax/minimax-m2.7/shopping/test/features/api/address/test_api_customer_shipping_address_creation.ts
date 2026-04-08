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
 * Test creating a new shipping address for an authenticated customer.
 *
 * Validates the complete address creation flow including customer authentication, address submission with all required fields, and verification of the created address. Ensures that the system correctly handles default address flag behavior when is_default is not specified.
 *
 * 1. Customer registers with valid credentials via POST /ecommerceMall/auth/customer/join.
 * 2. Customer creates a shipping address with recipient name, phone, street address, city, state, postal code, and country.
 * 3. System generates UUID id and timestamps for the new address.
 * 4. System sets is_default to false when not specified.
 */
export async function test_api_customer_shipping_address_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a new shipping address with all required fields
  const addressBody = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address: `${RandomGenerator.alphabets(5)} Street, ${RandomGenerator.alphabets(3)} Building`,
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: String(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >(),
    ),
    country: "South Korea",
  } satisfies IEcommerceMallShippingAddress.ICreate;
  const address =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: addressBody,
      },
    );
  typia.assert(address);
  // 3. Validate address contains all provided fields
  TestValidator.equals(
    "recipient_name matches",
    address.recipientName,
    addressBody.recipient_name,
  );
  TestValidator.equals("phone matches", address.phone, addressBody.phone);
  TestValidator.equals(
    "street_address matches",
    address.streetAddress,
    addressBody.street_address,
  );
  TestValidator.equals("city matches", address.city, addressBody.city);
  TestValidator.equals("state matches", address.state, addressBody.state);
  TestValidator.equals(
    "postal_code matches",
    address.postalCode,
    addressBody.postal_code,
  );
  TestValidator.equals("country matches", address.country, addressBody.country);
  // 4. Validate UUID id was generated
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      address.id,
    ),
  );
  // 5. Validate timestamps are set correctly
  TestValidator.predicate(
    "created_at is set",
    address.created_at !== null && address.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    address.updated_at !== null && address.updated_at !== undefined,
  );
  // 6. Validate is_default is false when not specified
  TestValidator.equals(
    "is_default is false by default",
    address.isDefault,
    false,
  );
}
