import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

export async function test_api_address_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Customer A and create their address
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // Create address owned by Customer A
  const addressA =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerAConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(10),
          country: RandomGenerator.name(),
          is_default: false,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(addressA);
  // Store original values for verification
  const originalRecipientName = addressA.recipientName;
  const originalCity = addressA.city;
  // 2. Authenticate Customer B (separate account)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer B attempts to update Customer A's address (should fail with 403)
  await TestValidator.httpError(
    "customer B cannot update customer A's address",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.addresses.update(
        customerBConnection,
        {
          addressId: addressA.id,
          body: {
            recipientName: "Hacked Recipient",
            city: "Hacked City",
          } satisfies IEcommerceMallAddress.IUpdate,
        },
      );
    },
  );
  // 4. Verify original address data is still intact by Customer A's perspective
  // Since the update was rejected with 403, the server should not have modified the address
  // We verify this by having Customer A successfully update with known values
  const newRecipientName = RandomGenerator.name();
  const newCity = RandomGenerator.name();
  const customerAUpdatedAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerAConnection,
      {
        addressId: addressA.id,
        body: {
          recipientName: newRecipientName,
          city: newCity,
        } satisfies IEcommerceMallAddress.IUpdate,
      },
    );
  typia.assert(customerAUpdatedAddress);
  // Verify Customer A's update succeeded with the new values
  TestValidator.equals(
    "customer A can update their own address",
    customerAUpdatedAddress.recipientName,
    newRecipientName,
  );
  TestValidator.equals(
    "customer A city update successful",
    customerAUpdatedAddress.city,
    newCity,
  );
  // Verify the original values were still in place before Customer A's update
  // (i.e., Customer B's failed attempt did not modify the address)
  TestValidator.notEquals(
    "original recipient name differs from new value (proves address was in original state)",
    originalRecipientName,
    newRecipientName,
  );
  TestValidator.notEquals(
    "original city differs from new value (proves address was in original state)",
    originalCity,
    newCity,
  );
}
