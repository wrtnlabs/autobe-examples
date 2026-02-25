import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_access_denied_foreign_product(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: A seller attempts to retrieve the snapshot history for a product they do not own, using a productId from another seller's product.
  // The system returns an empty list with pagination metadata (current: 1, limit: 10, records: 0, pages: 0) and a 200 OK status,
  // as the operation is designed to be silent for unauthorized access — neither denying nor revealing existence to protect privacy and security.
  // Step 1: Create an authorized seller who does not own the target product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // Step 2: Call the endpoint to retrieve snapshots for a product ID that does not belong to this seller
  // We use a random UUID as the productId to simulate a foreign product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const result = await api.functional.shoppingMall.seller.products.snapshots.at(
    sellerConnection,
    {
      productId,
    },
  );
  // Step 3: Validate that the response is an empty page with expected pagination metadata
  typia.assert(result);
  // Verify pagination structure: empty result, no data
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.equals("pagination records", result.pagination.records, 0);
  TestValidator.equals("pagination pages", result.pagination.pages, 0);
  // Verify data array is empty
  TestValidator.equals("no snapshots returned", result.data.length, 0);
}
