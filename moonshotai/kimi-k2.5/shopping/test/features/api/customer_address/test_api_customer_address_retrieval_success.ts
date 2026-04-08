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

export async function test_api_customer_address_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Establish customer authentication context
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Create a shipping address using the utility function
  const created =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(created);
  // Retrieve the specific address by ID
  const retrieved = await api.functional.ecommerceMall.customer.addresses.at(
    customerConnection,
    {
      addressId: created.id,
    },
  );
  typia.assert(retrieved);
  // Validate retrieved address matches created address
  TestValidator.equals("id matches", retrieved.id, created.id);
  TestValidator.equals(
    "recipientName matches",
    retrieved.recipientName,
    created.recipientName,
  );
  TestValidator.equals(
    "phoneNumber matches",
    retrieved.phoneNumber,
    created.phoneNumber,
  );
  TestValidator.equals(
    "streetAddress matches",
    retrieved.streetAddress,
    created.streetAddress,
  );
  TestValidator.equals("city matches", retrieved.city, created.city);
  TestValidator.equals("state matches", retrieved.state, created.state);
  TestValidator.equals(
    "postalCode matches",
    retrieved.postalCode,
    created.postalCode,
  );
  TestValidator.equals("country matches", retrieved.country, created.country);
  TestValidator.equals(
    "isDefault matches",
    retrieved.isDefault,
    created.isDefault,
  );
}
