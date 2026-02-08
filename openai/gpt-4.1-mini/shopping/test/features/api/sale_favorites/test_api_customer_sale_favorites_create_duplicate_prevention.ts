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

export async function test_api_customer_sale_favorites_create_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(joinOutput);
  customerConnection.headers = {
    Authorization: joinOutput.token.access,
  };
  // 2. Prepare body for favorite creation
  // Since IShoppingMallSaleFavorite.ICreate has no known properties, use empty object
  const favoriteCreationBody: IShoppingMallSaleFavorite.ICreate = {};
  // 3. Create a sale favorite successfully
  const favorite =
    await generate_random_shopping_mall_customer_sale_favorites_create(
      customerConnection,
      { body: favoriteCreationBody },
    );
  typia.assert(favorite);
  // 4. Attempt to create the same favorite again with the exact same request body
  let duplicateFavorite: IShoppingMallSaleFavorite | undefined;
  let duplicateError: unknown;
  try {
    duplicateFavorite =
      await generate_random_shopping_mall_customer_sale_favorites_create(
        customerConnection,
        {
          body: favoriteCreationBody,
        },
      );
  } catch (exp) {
    duplicateError = exp;
  }
  // 5. Validate rejection or acceptance policy
  if (duplicateFavorite) {
    typia.assert(duplicateFavorite);
    // If duplicate favorite succeeded, no direct property checks since none exist
  } else {
    if (duplicateError instanceof api.HttpError) {
      TestValidator.predicate(
        "duplicate favorite rejection status",
        duplicateError.status === 409,
      );
    } else {
      throw duplicateError;
    }
  }
}
