import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_specification_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to delete a non-existent sale specification by a seller and verify the system returns a 404 Not Found error.
  // Authenticate a new seller and then try to delete a specification with a random UUID specId that does not exist.
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate seller via join using the utility function authorize_seller_join
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  // Update sellerConnection headers with bearer token
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // Prepare a non-existent random UUID specId
  const specId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent sale specification, expect a 404 HttpError
  await TestValidator.httpError(
    "delete a non-existent sale specification returns 404 Not Found",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sale_specifications.erase(
        sellerConnection,
        {
          specId,
        },
      );
    },
  );
}
