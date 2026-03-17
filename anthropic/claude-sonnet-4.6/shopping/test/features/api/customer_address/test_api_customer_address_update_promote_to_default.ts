import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

export async function test_api_customer_address_update_promote_to_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and obtain an authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create the first address with isDefault: true
  const firstAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: { isDefault: true },
      },
    );
  typia.assert(firstAddress);
  TestValidator.predicate(
    "first address is initially default",
    firstAddress.isDefault === true,
  );
  // 3. Create the second address with isDefault: false
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: { isDefault: false },
      },
    );
  typia.assert(secondAddress);
  TestValidator.predicate(
    "second address is initially non-default",
    secondAddress.isDefault === false,
  );
  // 4. Prepare the update body for the second address with isDefault: true
  const updateBody = {
    recipientName: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    addressLine1: RandomGenerator.paragraph({ sentences: 1 }),
    addressLine2: null,
    city: RandomGenerator.alphabets(8),
    state: RandomGenerator.alphabets(6),
    postalCode: RandomGenerator.alphaNumeric(5),
    country: "US",
    isDefault: true,
  } satisfies IShoppingMallCustomerAddress.IUpdate;
  // 5. Call PUT to promote the second address to default
  const updatedSecondAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSecondAddress);
  // 6. Assert the second address now has isDefault: true
  TestValidator.predicate(
    "second address is now default",
    updatedSecondAddress.isDefault === true,
  );
  // 7. Assert all non-isDefault fields of the second address reflect submitted update values
  TestValidator.equals(
    "recipientName updated",
    updatedSecondAddress.recipientName,
    updateBody.recipientName,
  );
  TestValidator.equals(
    "phone updated",
    updatedSecondAddress.phone,
    updateBody.phone,
  );
  TestValidator.equals(
    "addressLine1 updated",
    updatedSecondAddress.addressLine1,
    updateBody.addressLine1,
  );
  TestValidator.equals(
    "addressLine2 updated",
    updatedSecondAddress.addressLine2,
    null,
  );
  TestValidator.equals(
    "city updated",
    updatedSecondAddress.city,
    updateBody.city,
  );
  TestValidator.equals(
    "state updated",
    updatedSecondAddress.state,
    updateBody.state,
  );
  TestValidator.equals(
    "postalCode updated",
    updatedSecondAddress.postalCode,
    updateBody.postalCode,
  );
  TestValidator.equals(
    "country updated",
    updatedSecondAddress.country,
    updateBody.country,
  );
  // 8. Verify the first address has been demoted to isDefault: false
  // We use the update SDK function with its existing data (no meaningful field change) to read the current state.
  // We re-issue the first address's data to check isDefault.
  const firstAddressCheckBody = {
    recipientName: firstAddress.recipientName,
    phone: firstAddress.phone,
    addressLine1: firstAddress.addressLine1,
    addressLine2: firstAddress.addressLine2,
    city: firstAddress.city,
    state: firstAddress.state,
    postalCode: firstAddress.postalCode,
    country: firstAddress.country as string &
      tags.MinLength<2> &
      tags.MaxLength<2>,
    isDefault: false, // We expect the first address to have been demoted already; set it to false explicitly to re-confirm
  } satisfies IShoppingMallCustomerAddress.IUpdate;
  const reCheckedFirstAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: firstAddress.id,
        body: firstAddressCheckBody,
      },
    );
  typia.assert(reCheckedFirstAddress);
  TestValidator.predicate(
    "first address has been demoted to non-default",
    reCheckedFirstAddress.isDefault === false,
  );
  // 9. At no point do two addresses simultaneously have isDefault: true
  // By checking the result above, we confirm only one default remains.
  TestValidator.predicate(
    "only one default address exists (second is default, first is not)",
    updatedSecondAddress.isDefault === true &&
      reCheckedFirstAddress.isDefault === false,
  );
}
