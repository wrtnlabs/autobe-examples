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

export async function test_api_shipping_address_delete_other_customer_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(ownerAuth);
  const protectedAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      ownerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(8),
          country: RandomGenerator.name(1),
          is_default: true,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert(protectedAddress);
  const protectedSnapshot = {
    id: protectedAddress.id,
    recipient_name: protectedAddress.recipient_name,
    phone_number: protectedAddress.phone_number,
    street_address: protectedAddress.street_address,
    city: protectedAddress.city,
    state_province: protectedAddress.state_province,
    postal_code: protectedAddress.postal_code,
    country: protectedAddress.country,
    is_default: protectedAddress.is_default,
    created_at: protectedAddress.created_at,
    updated_at: protectedAddress.updated_at,
  } satisfies IShoppingMallShippingAddress;
  const attackerConnection: api.IConnection = { host: connection.host };
  const attackerAuth = await authorize_customer_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(attackerAuth);
  await TestValidator.httpError(
    "another customer cannot delete someone else's shipping address",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.shippingAddresses.erase(
        attackerConnection,
        {
          addressId: protectedAddress.id,
        },
      );
    },
  );
  TestValidator.equals(
    "failed deletion attempt does not mutate the protected address snapshot",
    protectedAddress,
    protectedSnapshot,
  );
}
