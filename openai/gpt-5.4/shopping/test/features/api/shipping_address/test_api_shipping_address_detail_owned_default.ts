import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_shipping_address_detail_owned_default(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const createBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(1),
    is_default: true,
  } satisfies IShoppingMallShippingAddress.ICreate;
  const created =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  const found = await api.functional.shoppingMall.customer.shippingAddresses.at(
    customerConnection,
    {
      addressId: created.id,
    },
  );
  typia.assert(found);
  TestValidator.equals(
    "address id matches created resource",
    found.id,
    created.id,
  );
  TestValidator.equals(
    "recipient name matches saved address",
    found.recipient_name,
    created.recipient_name,
  );
  TestValidator.equals(
    "phone number matches saved address",
    found.phone_number,
    created.phone_number,
  );
  TestValidator.equals(
    "street address matches saved address",
    found.street_address,
    created.street_address,
  );
  TestValidator.equals("city matches saved address", found.city, created.city);
  TestValidator.equals(
    "state province matches saved address",
    found.state_province,
    created.state_province,
  );
  TestValidator.equals(
    "postal code matches saved address",
    found.postal_code,
    created.postal_code,
  );
  TestValidator.equals(
    "country matches saved address",
    found.country,
    created.country,
  );
  TestValidator.equals(
    "default designation is exposed",
    found.is_default,
    true,
  );
  TestValidator.equals(
    "created timestamp remains current record timestamp",
    found.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated timestamp remains current record timestamp",
    found.updated_at,
    created.updated_at,
  );
}
