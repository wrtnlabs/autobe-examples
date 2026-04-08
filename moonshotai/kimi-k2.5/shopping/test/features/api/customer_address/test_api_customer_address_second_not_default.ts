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

export async function test_api_customer_address_second_not_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  // 2. Create first shipping address (should become default)
  const firstAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(firstAddress);
  // 3. Verify first address is marked as default
  TestValidator.predicate(
    "first address is default",
    firstAddress.isDefault === true,
  );
  // 4. Create second shipping address with different details
  const secondAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(secondAddress);
  // 5. Verify second address is NOT marked as default
  TestValidator.predicate(
    "second address is not default",
    secondAddress.isDefault === false,
  );
  // 6. Validate both addresses are distinct
  TestValidator.notEquals(
    "address IDs differ",
    firstAddress.id,
    secondAddress.id,
  );
  // 7. Confirm first address ID is different from second
  TestValidator.predicate(
    "addresses have different recipients",
    firstAddress.recipientName !== secondAddress.recipientName ||
      firstAddress.streetAddress !== secondAddress.streetAddress,
  );
}
