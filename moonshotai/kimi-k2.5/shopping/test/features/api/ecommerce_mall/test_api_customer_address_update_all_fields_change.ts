import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

export async function test_api_customer_address_update_all_fields_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create initial address with specific values
  const initialAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          phoneNumber: "01012345678",
          streetAddress: "123 Original Street",
          city: "Old City",
          state: "Old State",
          postalCode: "10001",
          country: "Oldland",
        },
      },
    );
  typia.assert(initialAddress);
  // Keep original values for comparison
  const originalId = initialAddress.id;
  const originalIsDefault = initialAddress.isDefault;
  const originalCreatedAt = initialAddress.createdAt;
  // 3. Update address with completely different values for all fields
  const updateBody = {
    recipientName: "Jane Smith",
    phoneNumber: "01098765432",
    streetAddress: "456 New Avenue, Building B",
    city: "New City",
    state: "New State",
    postalCode: "99999",
    country: "Newland",
  } satisfies IEcommerceMallCustomer.IUpdate;
  const updatedAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: originalId,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  // 4. Verify all fields have been replaced with new values
  TestValidator.equals(
    "recipient name updated",
    updatedAddress.recipientName,
    "Jane Smith",
  );
  TestValidator.equals(
    "phone number updated",
    updatedAddress.phoneNumber,
    "01098765432",
  );
  TestValidator.equals(
    "street address updated",
    updatedAddress.streetAddress,
    "456 New Avenue, Building B",
  );
  TestValidator.equals("city updated", updatedAddress.city, "New City");
  TestValidator.equals("state updated", updatedAddress.state, "New State");
  TestValidator.equals(
    "postal code updated",
    updatedAddress.postalCode,
    "99999",
  );
  TestValidator.equals("country updated", updatedAddress.country, "Newland");
  // 5. Verify old values do not exist
  TestValidator.notEquals(
    "old recipient name removed",
    updatedAddress.recipientName,
    "John Doe",
  );
  TestValidator.notEquals(
    "old phone number removed",
    updatedAddress.phoneNumber,
    "01012345678",
  );
  TestValidator.notEquals(
    "old street address removed",
    updatedAddress.streetAddress,
    "123 Original Street",
  );
  TestValidator.notEquals("old city removed", updatedAddress.city, "Old City");
  TestValidator.notEquals(
    "old state removed",
    updatedAddress.state,
    "Old State",
  );
  TestValidator.notEquals(
    "old postal code removed",
    updatedAddress.postalCode,
    "10001",
  );
  TestValidator.notEquals(
    "old country removed",
    updatedAddress.country,
    "Oldland",
  );
  // 6. Verify immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedAddress.id, originalId);
  TestValidator.equals(
    "isDefault unchanged",
    updatedAddress.isDefault,
    originalIsDefault,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updatedAddress.createdAt,
    originalCreatedAt,
  );
  // 7. Verify audit timestamps - updatedAt should be later than createdAt
  TestValidator.predicate("updatedAt after initial updatedAt", () => {
    const updatedAtNew = new Date(updatedAddress.updatedAt).getTime();
    const updatedAtOld = new Date(initialAddress.updatedAt).getTime();
    return updatedAtNew >= updatedAtOld;
  });
}
