import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_account_cross_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const anonymousConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "anonymous access to seller account detail is forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.sellers.at(anonymousConnection, {
        sellerId,
      });
    },
  );
}
