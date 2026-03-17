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

export async function test_api_customer_address_creation_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and get an authorized session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const customerId = authorized.id;
  // 2. Test Case 1: Create address without addressLine2 (null)
  const body1 = {
    recipientName: "John Doe",
    phone: "01012345678",
    addressLine1: "123 Main St",
    addressLine2: null,
    city: "Seoul",
    state: "Gyeonggi",
    postalCode: "12345",
    country: "KR" as string & tags.MinLength<2> & tags.MaxLength<2>,
    isDefault: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      { body: body1 },
    );
  typia.assert(address1);
  // Validate case 1 business logic
  TestValidator.equals(
    "customerId matches authenticated customer",
    address1.customerId,
    customerId,
  );
  TestValidator.equals(
    "recipientName matches input",
    address1.recipientName,
    body1.recipientName,
  );
  TestValidator.equals("phone matches input", address1.phone, body1.phone);
  TestValidator.equals(
    "addressLine1 matches input",
    address1.addressLine1,
    body1.addressLine1,
  );
  TestValidator.equals("addressLine2 is null", address1.addressLine2, null);
  TestValidator.equals("city matches input", address1.city, body1.city);
  TestValidator.equals("state matches input", address1.state, body1.state);
  TestValidator.equals(
    "postalCode matches input",
    address1.postalCode,
    body1.postalCode,
  );
  TestValidator.equals(
    "country matches input",
    address1.country,
    body1.country,
  );
  TestValidator.equals("isDefault is false", address1.isDefault, false);
  TestValidator.equals("deletedAt is null", address1.deletedAt, null);
  // 3. Test Case 2: Create address with non-null addressLine2
  const body2 = {
    recipientName: "Jane Smith",
    phone: "01098765432",
    addressLine1: "456 Second Ave",
    addressLine2: "Apt 5B",
    city: "Busan",
    state: "South Gyeongsang",
    postalCode: "67890",
    country: "KR" as string & tags.MinLength<2> & tags.MaxLength<2>,
    isDefault: false,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      { body: body2 },
    );
  typia.assert(address2);
  // Validate case 2 business logic
  TestValidator.equals(
    "customerId matches authenticated customer (case 2)",
    address2.customerId,
    customerId,
  );
  TestValidator.equals(
    "recipientName matches input (case 2)",
    address2.recipientName,
    body2.recipientName,
  );
  TestValidator.equals(
    "phone matches input (case 2)",
    address2.phone,
    body2.phone,
  );
  TestValidator.equals(
    "addressLine1 matches input (case 2)",
    address2.addressLine1,
    body2.addressLine1,
  );
  TestValidator.equals(
    "addressLine2 matches non-null input",
    address2.addressLine2,
    "Apt 5B",
  );
  TestValidator.equals(
    "city matches input (case 2)",
    address2.city,
    body2.city,
  );
  TestValidator.equals(
    "state matches input (case 2)",
    address2.state,
    body2.state,
  );
  TestValidator.equals(
    "postalCode matches input (case 2)",
    address2.postalCode,
    body2.postalCode,
  );
  TestValidator.equals(
    "country matches input (case 2)",
    address2.country,
    body2.country,
  );
  TestValidator.equals(
    "isDefault is false (case 2)",
    address2.isDefault,
    false,
  );
  TestValidator.equals("deletedAt is null (case 2)", address2.deletedAt, null);
  // 4. Verify both addresses are distinct (different IDs)
  TestValidator.notEquals(
    "two addresses have different IDs",
    address1.id,
    address2.id,
  );
}
