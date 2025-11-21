import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_list_unauthenticated(
  connection: api.IConnection,
) {
  // Test unauthenticated access to seller list endpoint using PATCH method
  // This should return 401 Unauthorized as per the scenario requirements
  // No authentication token is provided, so the server should reject the request

  // Create empty request body as specified by IShoppingMallSeller.IRequest - all properties are optional
  const emptyRequest = {} satisfies IShoppingMallSeller.IRequest;

  // Call the endpoint with no authentication header
  // The API will reject unauthenticated access with 401 status code
  await TestValidator.error(
    "unauthenticated access should return 401 Unauthorized",
    async () => {
      await api.functional.shoppingMall.admin.actors.sellers.index(connection, {
        body: emptyRequest,
      });
    },
  );
}
