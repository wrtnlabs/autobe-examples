import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_existing_administrator_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: "fixture-existing-administrator-customer@example.com",
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/shopping-mall/administrator-request",
      referrer: "https://example.com/shopping-mall",
    },
  });
  typia.assert(joinedCustomer);
  const requestBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdministratorRequest.ICreate;
  await TestValidator.error(
    "existing administrator cannot create another administrator request",
    async () => {
      await generate_random_shopping_mall_customer_administrator_requests_create(
        customerConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
