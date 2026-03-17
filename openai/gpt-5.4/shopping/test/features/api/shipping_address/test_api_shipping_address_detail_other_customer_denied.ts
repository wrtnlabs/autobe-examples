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

export async function test_api_shipping_address_detail_other_customer_denied(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(ownerAuth);
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
  const created: IShoppingMallShippingAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      ownerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(intruderConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(intruderAuth);
  await TestValidator.httpError(
    "other customer cannot read another customer's shipping address",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.shippingAddresses.at(
        intruderConnection,
        {
          addressId: created.id,
        },
      );
    },
  );
  const persisted: IShoppingMallShippingAddress =
    await api.functional.shoppingMall.customer.shippingAddresses.at(
      ownerConnection,
      {
        addressId: created.id,
      },
    );
  typia.assert(persisted);
  TestValidator.equals(
    "address remains unchanged after rejected cross-customer access",
    persisted,
    created,
  );
  TestValidator.equals(
    "owner can still read same address id",
    persisted.id,
    created.id,
  );
}
