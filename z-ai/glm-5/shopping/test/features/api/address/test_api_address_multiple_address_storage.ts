import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test the system's support for unlimited address storage by creating multiple
 * shipping addresses for the same customer, verifying proper address management
 * and default status handling.
 */
export async function test_api_address_multiple_address_storage(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first address (home address) - should become default
  const homeAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          phoneNumber: "010-1234-5678",
          streetAddress: "123 Main Street",
          city: "Seoul",
          stateProvince: "Gangnam-gu",
          postalCode: "06000",
          country: "South Korea",
        },
      },
    );
  typia.assert(homeAddress);
  // Verify first address is default
  TestValidator.equals(
    "first address should be default",
    homeAddress.isDefault,
    true,
  );
  TestValidator.equals(
    "first address deletedAt is null",
    homeAddress.deletedAt,
    null,
  );
  // 3. Create second address (work address) - should NOT be default
  const workAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          phoneNumber: "010-9876-5432",
          streetAddress: "456 Business Avenue",
          city: "Seoul",
          stateProvince: "Jongno-gu",
          postalCode: "03000",
          country: "South Korea",
        },
      },
    );
  typia.assert(workAddress);
  // Verify second address is NOT default
  TestValidator.equals(
    "second address should not be default",
    workAddress.isDefault,
    false,
  );
  TestValidator.equals(
    "second address deletedAt is null",
    workAddress.deletedAt,
    null,
  );
  // 4. Create third address (gift recipient address) - should NOT be default
  const giftAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Jane Smith",
          phoneNumber: "010-5555-1234",
          streetAddress: "789 Gift Lane",
          city: "Busan",
          stateProvince: "Haeundae-gu",
          postalCode: "48000",
          country: "South Korea",
        },
      },
    );
  typia.assert(giftAddress);
  // Verify third address is NOT default
  TestValidator.equals(
    "third address should not be default",
    giftAddress.isDefault,
    false,
  );
  TestValidator.equals(
    "third address deletedAt is null",
    giftAddress.deletedAt,
    null,
  );
  // 5. Verify all addresses have unique IDs
  TestValidator.notEquals(
    "home and work addresses have different IDs",
    homeAddress.id,
    workAddress.id,
  );
  TestValidator.notEquals(
    "home and gift addresses have different IDs",
    homeAddress.id,
    giftAddress.id,
  );
  TestValidator.notEquals(
    "work and gift addresses have different IDs",
    workAddress.id,
    giftAddress.id,
  );
  // 6. Verify submitted field values are stored correctly
  TestValidator.equals(
    "home address recipient matches",
    homeAddress.recipientName,
    "John Doe",
  );
  TestValidator.equals(
    "home address phone matches",
    homeAddress.phoneNumber,
    "010-1234-5678",
  );
  TestValidator.equals(
    "home address street matches",
    homeAddress.streetAddress,
    "123 Main Street",
  );
  TestValidator.equals("home address city matches", homeAddress.city, "Seoul");
  TestValidator.equals(
    "home address state matches",
    homeAddress.stateProvince,
    "Gangnam-gu",
  );
  TestValidator.equals(
    "home address postal matches",
    homeAddress.postalCode,
    "06000",
  );
  TestValidator.equals(
    "home address country matches",
    homeAddress.country,
    "South Korea",
  );
  TestValidator.equals(
    "work address recipient matches",
    workAddress.recipientName,
    "John Doe",
  );
  TestValidator.equals(
    "work address phone matches",
    workAddress.phoneNumber,
    "010-9876-5432",
  );
  TestValidator.equals(
    "work address street matches",
    workAddress.streetAddress,
    "456 Business Avenue",
  );
  TestValidator.equals("work address city matches", workAddress.city, "Seoul");
  TestValidator.equals(
    "work address state matches",
    workAddress.stateProvince,
    "Jongno-gu",
  );
  TestValidator.equals(
    "work address postal matches",
    workAddress.postalCode,
    "03000",
  );
  TestValidator.equals(
    "work address country matches",
    workAddress.country,
    "South Korea",
  );
  TestValidator.equals(
    "gift address recipient matches",
    giftAddress.recipientName,
    "Jane Smith",
  );
  TestValidator.equals(
    "gift address phone matches",
    giftAddress.phoneNumber,
    "010-5555-1234",
  );
  TestValidator.equals(
    "gift address street matches",
    giftAddress.streetAddress,
    "789 Gift Lane",
  );
  TestValidator.equals("gift address city matches", giftAddress.city, "Busan");
  TestValidator.equals(
    "gift address state matches",
    giftAddress.stateProvince,
    "Haeundae-gu",
  );
  TestValidator.equals(
    "gift address postal matches",
    giftAddress.postalCode,
    "48000",
  );
  TestValidator.equals(
    "gift address country matches",
    giftAddress.country,
    "South Korea",
  );
}
