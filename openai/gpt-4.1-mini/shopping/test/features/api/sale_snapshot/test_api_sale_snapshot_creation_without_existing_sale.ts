import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sale_snapshots_create } from "../../../generate/generate_random_shopping_mall_seller_sale_snapshots_create";
import { prepare_random_shopping_mall_sale_snapshot } from "../../../prepare/prepare_random_shopping_mall_sale_snapshot";

export async function test_api_sale_snapshot_creation_without_existing_sale(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new seller.
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 2. Attempt to create a sale snapshot with invalid sale reference (non-existent id).
  const invalidSaleSnapshotBody: IShoppingMallSaleSnapshot.ICreate = {
    // The schema of IShoppingMallSaleSnapshot.ICreate is empty, but per description,
    // it must include required fields: shoppingMallSaleId, title, description, categoryId, basePrice,
    // so we must provide them here.
    shoppingMallSaleId: "00000000-0000-0000-0000-000000000000", // Non-existing UUID
    title: "Snapshot without existing sale",
    description:
      "This snapshot attempts creation without a valid existing sale.",
    categoryId: "00000000-0000-0000-0000-000000000000", // Dummy UUID, no actual relation needed
    basePrice: 1000,
  };
  await TestValidator.httpError(
    "create sale snapshot without existing sale should fail with error",
    400,
    async () => {
      // Use generate_random_shopping_mall_seller_sale_snapshots_create utility to invoke
      // to comply with utility usage priority. We must pass the sellerConnection and body.
      await generate_random_shopping_mall_seller_sale_snapshots_create(
        sellerConnection,
        {
          body: invalidSaleSnapshotBody,
        },
      );
    },
  );
}
