import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_admin_request_create } from "../../../generate/generate_random_shopping_mall_admin_request_create";
import { prepare_random_shopping_mall_admin } from "../../../prepare/prepare_random_shopping_mall_admin";

export async function test_api_administrator_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer account to authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const joinOutput = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>() satisfies string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255> as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>,
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: RandomGenerator.alphabets(10) + ".example.com",
        referrer: RandomGenerator.alphabets(10) + ".example.com",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(joinOutput);
  // 2. Create administrator request with the authenticated customer
  const requestOutput = await api.functional.shoppingMall.admin.request.create(
    customerConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallAdmin.ICreate,
    },
  );
  typia.assert(requestOutput);
}