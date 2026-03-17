import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_not_found_when_unavailable(
  connection: api.IConnection,
): Promise<void> {
  const publicConnection: api.IConnection = { host: connection.host };
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unavailable seller profile returns not found",
    404,
    async () => {
      await api.functional.shoppingMall.seller_profiles.at(publicConnection, {
        sellerProfileId,
      });
    },
  );
}
