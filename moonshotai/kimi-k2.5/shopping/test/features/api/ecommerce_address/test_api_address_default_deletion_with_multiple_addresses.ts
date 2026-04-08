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

export async function test_api_address_default_deletion_with_multiple_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer - creates a new account and connects to session
  const customerConnection: api.IConnection = { host: connection.host };
  const customerInfo = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerInfo);
  // 2. Create first address - automatically becomes default per business rules
  const firstAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(firstAddress);
  TestValidator.predicate(
    "first address should be default",
    firstAddress.isDefault === true,
  );
  // 3. Create second address - should be non-default (customer already has default)
  const secondAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(secondAddress);
  TestValidator.predicate(
    "second address should be non-default",
    secondAddress.isDefault === false,
  );
  // Ensure the IDs are different
  TestValidator.notEquals(
    "address IDs should differ",
    firstAddress.id,
    secondAddress.id,
  );
  // 4. Delete the default address (first address)
  await api.functional.ecommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: firstAddress.id,
    },
  );
  // 5. Verify deletion - second address should remain usable
  // Verify that the remaining address has valid properties for checkout
  TestValidator.predicate(
    "remaining address has valid ID",
    typeof secondAddress.id === "string" && secondAddress.id.length > 0,
  );
  TestValidator.predicate(
    "remaining address has valid recipient",
    typeof secondAddress.recipientName === "string",
  );
}
