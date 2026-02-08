import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_specification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve detailed technical specification data for an existing sale specification identified by its valid UUID 'specId'.
  // This test includes authenticating as a seller, providing a valid 'specId' that exists in the database, and verifying that the response contains all expected fields.
  // 1. Seller registration (join) to obtain authorization token
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Use authorized seller connection for the API call
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Generate a valid UUID as a specId for testing retrieval
  // Note: We assume this specId exists in the database for this test
  const specId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the sale specification
  const saleSpecification =
    await api.functional.shoppingMall.seller.sale_specifications.at(
      sellerConnection,
      {
        specId,
      },
    );
  // 5. Assert the received specification object
  typia.assert(saleSpecification);
  // 6. Since IShoppingMallSaleSpecification schema is empty, we cannot check specific properties
}
