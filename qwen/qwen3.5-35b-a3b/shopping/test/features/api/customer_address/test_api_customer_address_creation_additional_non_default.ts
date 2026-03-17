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

export async function test_api_customer_address_creation_additional_non_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication via join
  const customerAuthResult = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://google.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthResult);
  // 2. Create actor-specific connection from authentication token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: customerAuthResult.token.access,
    },
  };
  // 3. Create first address (should be auto-default with is_default = true)
  const firstAddressInput = {
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    street: `${RandomGenerator.alphabets(5)} ${RandomGenerator.alphabets(4)} St`,
    city: RandomGenerator.alphabets(6),
    state: RandomGenerator.alphabets(4),
  } satisfies IEcommerceMallAddress.ICreate;
  const firstAddress =
    await api.functional.ecommerceMall.customer.addresses.create(
      customerConnection,
      { body: firstAddressInput },
    );
  typia.assert(firstAddress);
  // 4. Create second address (should be non-default with is_default = false)
  const secondAddressInput = {
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    street: `${RandomGenerator.alphabets(5)} ${RandomGenerator.alphabets(4)} Ave`,
    city: RandomGenerator.alphabets(6),
    state: RandomGenerator.alphabets(4),
  } satisfies IEcommerceMallAddress.ICreate;
  const secondAddress =
    await api.functional.ecommerceMall.customer.addresses.create(
      customerConnection,
      { body: secondAddressInput },
    );
  typia.assert(secondAddress);
  // 5. Validate first address is default
  TestValidator.equals(
    "first address is_default",
    firstAddress.is_default,
    true,
  );
  // 6. Validate second address is not default
  TestValidator.equals(
    "second address is_default",
    secondAddress.is_default,
    false,
  );
  // 7. Validate recipient_name matches input for both addresses
  TestValidator.equals(
    "first address recipient_name matches",
    firstAddress.recipient_name,
    firstAddressInput.recipient_name,
  );
  TestValidator.equals(
    "second address recipient_name matches",
    secondAddress.recipient_name,
    secondAddressInput.recipient_name,
  );
  // 8. Validate recipient_phone matches input for both addresses
  TestValidator.equals(
    "first address recipient_phone matches",
    firstAddress.recipient_phone,
    firstAddressInput.recipient_phone,
  );
  TestValidator.equals(
    "second address recipient_phone matches",
    secondAddress.recipient_phone,
    secondAddressInput.recipient_phone,
  );
  // 9. Validate street matches input for both addresses
  TestValidator.equals(
    "first address street matches",
    firstAddress.street,
    firstAddressInput.street,
  );
  TestValidator.equals(
    "second address street matches",
    secondAddress.street,
    secondAddressInput.street,
  );
  // 10. Validate city matches input for both addresses
  TestValidator.equals(
    "first address city matches",
    firstAddress.city,
    firstAddressInput.city,
  );
  TestValidator.equals(
    "second address city matches",
    secondAddress.city,
    secondAddressInput.city,
  );
  // 11. Validate state matches input for both addresses
  TestValidator.equals(
    "first address state matches",
    firstAddress.state,
    firstAddressInput.state,
  );
  TestValidator.equals(
    "second address state matches",
    secondAddress.state,
    secondAddressInput.state,
  );
  // 12. Validate both addresses have valid UUID IDs
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "first address ID is valid UUID",
    uuidRegex.test(firstAddress.id),
  );
  TestValidator.predicate(
    "second address ID is valid UUID",
    uuidRegex.test(secondAddress.id),
  );
  // 13. Validate both addresses share same customer_id from authentication
  TestValidator.equals(
    "first address customer_id matches auth",
    firstAddress.ecommerce_mall_customer_id,
    customerAuthResult.id,
  );
  TestValidator.equals(
    "second address customer_id matches auth",
    secondAddress.ecommerce_mall_customer_id,
    customerAuthResult.id,
  );
  // 14. Validate timestamps exist and are valid ISO date-time format
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  TestValidator.predicate(
    "first address has valid created_at",
    dateTimeRegex.test(firstAddress.created_at),
  );
  TestValidator.predicate(
    "first address has valid updated_at",
    dateTimeRegex.test(firstAddress.updated_at),
  );
  TestValidator.predicate(
    "second address has valid created_at",
    dateTimeRegex.test(secondAddress.created_at),
  );
  TestValidator.predicate(
    "second address has valid updated_at",
    dateTimeRegex.test(secondAddress.updated_at),
  );
  // 15. Validate both addresses have deleted_at = null (active status)
  TestValidator.equals(
    "first address deleted_at is null",
    firstAddress.deleted_at,
    null,
  );
  TestValidator.equals(
    "second address deleted_at is null",
    secondAddress.deleted_at,
    null,
  );
  // 16. Validate each address maintains independent is_default status
  TestValidator.notEquals(
    "addresses have different is_default status",
    firstAddress.is_default,
    secondAddress.is_default,
  );
}
