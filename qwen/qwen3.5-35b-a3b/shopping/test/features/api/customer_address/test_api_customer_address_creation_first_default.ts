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

export async function test_api_customer_address_creation_first_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create first shipping address
  const addressInput = {
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    street: typia.random<string & tags.MinLength<1>>(),
    city: typia.random<string & tags.MinLength<1>>(),
    state: typia.random<string & tags.MinLength<1>>(),
  } satisfies IEcommerceMallAddress.ICreate;
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      { body: addressInput },
    );
  typia.assert(address);
  // 3. Validate is_default is true for first address
  TestValidator.equals(
    "first address should be default",
    address.is_default,
    true,
  );
  // 4. Validate generated ID exists
  TestValidator.predicate("address has valid UUID id", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      address.id,
    ),
  );
  // 5. Validate customer_id matches authenticated customer
  TestValidator.equals(
    "customer_id matches authenticated customer",
    address.ecommerce_mall_customer_id,
    customer.id,
  );
  // 6. Validate recipient data matches input
  TestValidator.equals(
    "recipient_name matches input",
    address.recipient_name,
    addressInput.recipient_name,
  );
  TestValidator.equals(
    "recipient_phone matches input",
    address.recipient_phone,
    addressInput.recipient_phone,
  );
  TestValidator.equals(
    "street matches input",
    address.street,
    addressInput.street,
  );
  TestValidator.equals("city matches input", address.city, addressInput.city);
  TestValidator.equals(
    "state matches input",
    address.state,
    addressInput.state,
  );
  // 7. Validate deleted_at is null for active address
  TestValidator.equals(
    "deleted_at is null for active address",
    address.deleted_at,
    null,
  );
}