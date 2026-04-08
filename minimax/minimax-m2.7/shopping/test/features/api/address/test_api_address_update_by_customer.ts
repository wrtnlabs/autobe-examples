import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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

export async function test_api_address_update_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create initial shipping address
  const initialAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(initialAddress);
  const initialUpdatedAt = initialAddress.updated_at;
  // 3. Prepare update data with new values
  const updatedBody: IEcommerceMallShippingAddress.IUpdate = {
    recipientName: "Updated Recipient Name",
    phone: "999-888-7777",
    streetAddress: "456 New Street",
    city: "New City",
    state: "New State",
    postalCode: "99999",
    country: "New Country",
  };
  // 4. Send PUT request to update the address
  const updatedAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: updatedBody,
      },
    );
  typia.assert(updatedAddress);
  // 5. Verify all fields are updated correctly
  TestValidator.equals(
    "recipientName updated",
    updatedAddress.recipient_name,
    "Updated Recipient Name",
  );
  TestValidator.equals("phone updated", updatedAddress.phone, "999-888-7777");
  TestValidator.equals(
    "streetAddress updated",
    updatedAddress.street_address,
    "456 New Street",
  );
  TestValidator.equals("city updated", updatedAddress.city, "New City");
  TestValidator.equals("state updated", updatedAddress.state, "New State");
  TestValidator.equals(
    "postalCode updated",
    updatedAddress.postal_code,
    "99999",
  );
  TestValidator.equals(
    "country updated",
    updatedAddress.country,
    "New Country",
  );
  // 6. Verify updated_at timestamp is set and changed
  TestValidator.predicate(
    "updated_at is set",
    updatedAddress.updated_at !== null &&
      updatedAddress.updated_at !== undefined,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updatedAddress.updated_at,
    initialUpdatedAt,
  );
  // 7. Verify customer relationship is preserved
  TestValidator.equals(
    "customer id preserved",
    updatedAddress.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email preserved",
    updatedAddress.customer.email,
    authorized.email,
  );
  // 8. Verify address ID remains the same
  TestValidator.equals(
    "address id unchanged",
    updatedAddress.id,
    initialAddress.id,
  );
  // 9. Verify is_default status is preserved (not changed)
  TestValidator.equals(
    "is_default preserved",
    updatedAddress.is_default,
    initialAddress.is_default,
  );
}
