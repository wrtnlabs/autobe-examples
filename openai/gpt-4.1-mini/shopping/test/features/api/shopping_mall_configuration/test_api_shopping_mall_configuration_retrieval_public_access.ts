import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

export async function test_api_shopping_mall_configuration_retrieval_public_access(
  connection: api.IConnection,
) {
  // Select a random key string to attempt retrieval
  const key = typia.random<string & tags.MinLength<1>>();

  // Fetch the shopping mall configuration by key without authentication
  const result: IShoppingMallConfiguration =
    await api.functional.shoppingMall.shoppingMallConfigurations.at(
      connection,
      { key },
    );
  typia.assert(result); // Validates complete structure and formats
}
