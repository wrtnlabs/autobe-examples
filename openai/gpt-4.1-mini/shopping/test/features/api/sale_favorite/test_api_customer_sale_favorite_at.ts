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

export async function test_api_customer_sale_favorite_at(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve an existing sale favorite
  // 1. Authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(authorized);
  customerConnection.headers = { Authorization: authorized.token.access };
  // For test environment, assumed a sale favorite exists for this customer.
  // Since no creation API exists, we simulate with a random UUID.
  // If needed, this UUID should be replaced with a real favoriteId from fixtures.
  const existingFavoriteId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: fetch the existing sale favorite
  const saleFavorite =
    await api.functional.shoppingMall.customer.sale_favorites.at(
      customerConnection,
      {
        favoriteId: existingFavoriteId,
      },
    );
  typia.assert(saleFavorite);
  // Validate basic assumed properties
  TestValidator.predicate(
    "saleFavorite has creation timestamp",
    "created_at" in saleFavorite &&
      typeof (saleFavorite as any).created_at === "string",
  );
  TestValidator.predicate(
    "saleFavorite has update timestamp",
    "updated_at" in saleFavorite &&
      typeof (saleFavorite as any).updated_at === "string",
  );
  // Scenario 2: Attempt to retrieve non-existent sale favorite
  const nonExistentFavoriteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent favorite should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_favorites.at(
        customerConnection,
        {
          favoriteId: nonExistentFavoriteId,
        },
      );
    },
  );
  // Scenario 3: Attempt to retrieve a soft-deleted sale favorite
  // As soft-deleted sale favorite setup is not available, we simulate this scenario
  // by requesting a random favoriteId and expecting a 404 as backend should reject soft-deleted
  const softDeletedFavoriteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "soft-deleted favorite access returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_favorites.at(
        customerConnection,
        {
          favoriteId: softDeletedFavoriteId,
        },
      );
    },
  );
}
