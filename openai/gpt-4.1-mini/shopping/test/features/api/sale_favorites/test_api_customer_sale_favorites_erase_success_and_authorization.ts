import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_sale_favorites_create } from "../../../generate/generate_random_shopping_mall_customer_sale_favorites_create";
import { prepare_random_shopping_mall_sale_favorite } from "../../../prepare/prepare_random_shopping_mall_sale_favorite";

export async function test_api_customer_sale_favorites_erase_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer account creation and authorization
  const customerConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_customer_join(customerConnection1, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com`,
      password: "StrongPass123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection1.headers = {
    Authorization: authorized1.token.access,
  };
  // 2. Create a sale favorite using the authorized connection
  const favorite =
    await generate_random_shopping_mall_customer_sale_favorites_create(
      customerConnection1,
      {
        body: {},
      },
    );
  typia.assert(favorite);
  const favoriteId = typia.assert<string & tags.Format<"uuid">>(favorite);

  // 3. Delete the created favorite
  await api.functional.shoppingMall.customer.sale_favorites.erase(
    customerConnection1,
    {
      favoriteId: favoriteId,
    },
  );
  // 4. Verify that the favorite is no longer accessible (soft deleted)
  // Here we check deletion by attempting to delete again and expect error
  await TestValidator.httpError(
    "delete soft-deleted favorite should fail with 404",
    404,
    async () =>
      await api.functional.shoppingMall.customer.sale_favorites.erase(
        customerConnection1,
        {
          favoriteId: favoriteId,
        },
      ),
  );
  // 5. Create another customer and authorize
  const customerConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_customer_join(customerConnection2, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com`,
      password: "StrongPass123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection2.headers = {
    Authorization: authorized2.token.access,
  };
  // 6. Attempt to delete the favorite created by first customer with another customer's connection
  await TestValidator.httpError(
    "unauthorized delete of another customer's favorite should fail",
    403,
    async () =>
      await api.functional.shoppingMall.customer.sale_favorites.erase(
        customerConnection2,
        {
          favoriteId: favoriteId,
        },
      ),
  );
  // 7. Attempt to delete a non-existent favoriteId
  await TestValidator.httpError(
    "deletion of non-existent favorite should fail with 404",
    404,
    async () =>
      await api.functional.shoppingMall.customer.sale_favorites.erase(
        customerConnection1,
        {
          favoriteId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
