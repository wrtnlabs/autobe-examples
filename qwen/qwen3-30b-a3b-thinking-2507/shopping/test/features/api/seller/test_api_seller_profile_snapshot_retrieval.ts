import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_profile_snapshots_create } from "../../../generate/generate_random_shopping_mall_seller_profile_snapshots_create";
import { prepare_random_shopping_mall_seller_profile_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_snapshot";

export async function test_api_seller_profile_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new connection for seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {} satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Step 2: Create a seller profile snapshot for testing
  const snapshot: IShoppingMallSellerProfileSnapshot =
    await generate_random_shopping_mall_seller_profile_snapshots_create(
      sellerConnection,
      {
        body: {
          shopName: RandomGenerator.name(),
          logoUrl: "https://" + RandomGenerator.alphaNumeric(8) + ".com/logo",
        } satisfies IShoppingMallSellerProfileSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // Step 3: Retrieve the snapshot by ID
  const retrievedSnapshot: IShoppingMallSellerProfileSnapshot =
    await api.functional.shoppingMall.seller.profile_snapshots.at(
      sellerConnection,
      {
        id: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Step 4: Validate the snapshot data
  TestValidator.equals(
    "shop name matches",
    retrievedSnapshot.shop_name,
    snapshot.shop_name,
  );
  TestValidator.equals(
    "logo URL matches",
    retrievedSnapshot.logo_url,
    snapshot.logo_url,
  );
  TestValidator.equals("ID matches", retrievedSnapshot.id, snapshot.id);
}
